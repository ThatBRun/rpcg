import SwiftUI
import AudioToolbox

struct ChatLine: Identifiable, Equatable {
    let id = UUID()
    let fromUser: Bool
    let text: String
}

/// Runs NOVA: wake word, listening, thinking (Gemini) and talking back.
@MainActor
final class NovaBrain: ObservableObject {
    static let shared = NovaBrain()

    enum Phase: Equatable { case idle, waitingForWake, listening, thinking, speaking }

    @Published private(set) var phase: Phase = .idle
    @Published private(set) var heard = ""
    @Published private(set) var lines: [ChatLine] = []
    @Published var notice: String?

    private let settings = NovaSettings.shared
    private let ears = Ears()
    private let mouth = Mouth()
    private let gemini = GeminiClient()
    private let tools = NovaTools()

    private static let wakeWords = ["nova", "no va", "noba", "nava", "nove"]

    private var appActive = false
    private var pendingSiri = false
    private var commandStart = 0          // where the command begins in the current transcript
    private var command = ""
    private var lastInputWasVoice = false
    private var silenceTimer: Task<Void, Never>?
    private var wakeRestartTimer: Task<Void, Never>?
    private var permissionOK = false

    private init() {
        ears.onTranscript = { [weak self] text in self?.transcript(text) }
        ears.onEnded = { [weak self] in self?.earsEnded() }
        mouth.onFinished = { [weak self] in self?.doneSpeaking() }
    }

    // MARK: - App life cycle

    func appPhaseChanged(active: Bool) {
        appActive = active
        if active {
            UIApplication.shared.isIdleTimerDisabled = settings.handsFree
            if pendingSiri {
                pendingSiri = false
                listenNow()
            } else if phase == .idle {
                startWakeLoop()
            }
        } else {
            UIApplication.shared.isIdleTimerDisabled = false
            stopListening()
            if phase == .waitingForWake || phase == .listening { phase = .idle }
        }
    }

    func settingsChanged() {
        UIApplication.shared.isIdleTimerDisabled = appActive && settings.handsFree
        if settings.handsFree {
            if phase == .idle { startWakeLoop() }
        } else if phase == .waitingForWake {
            stopListening()
            phase = .idle
            AudioSession.release()
        }
    }

    /// "Hey Siri, NOVA" lands here.
    func activatedBySiri() {
        if appActive {
            listenNow()
        } else {
            pendingSiri = true
        }
    }

    // MARK: - Listening

    /// Mic button / orb tap.
    func micTapped() {
        switch phase {
        case .listening:
            if command.isEmpty { backToWaiting() } else { finishCommand() }
        case .speaking:
            mouth.stop()
            listenNow()
        case .thinking:
            break
        default:
            listenNow()
        }
    }

    func listenNow() {
        guard settings.hasKey else { notice = NovaError.noKey.errorDescription; return }
        mouth.stop()
        Task {
            guard await ensurePermission() else { return }
            beginEars(phase: .listening)
            chime()
            armSilence(seconds: 7)    // give up if nothing is said
        }
    }

    private func startWakeLoop() {
        guard appActive, settings.handsFree, settings.hasKey else { return }
        Task {
            guard await ensurePermission() else { return }
            guard appActive, settings.handsFree, phase == .idle || phase == .waitingForWake else { return }
            beginEars(phase: .waitingForWake)
            // Speech sessions are limited to about a minute; refresh them quietly.
            wakeRestartTimer?.cancel()
            wakeRestartTimer = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 50_000_000_000)
                guard let self, !Task.isCancelled, self.phase == .waitingForWake else { return }
                self.startWakeLoop()
            }
        }
    }

    private func beginEars(phase newPhase: Phase) {
        command = ""
        heard = ""
        commandStart = 0
        do {
            try ears.start()
            phase = newPhase
            notice = nil
        } catch {
            phase = .idle
            notice = (error as? NovaError)?.errorDescription ?? "Couldn't start the microphone."
        }
    }

    private func transcript(_ text: String) {
        switch phase {
        case .waitingForWake:
            let lower = text.lowercased()
            for word in Self.wakeWords {
                if let r = lower.range(of: word, options: .backwards) {
                    commandStart = lower.distance(from: lower.startIndex, to: r.upperBound)
                    phase = .listening
                    wakeRestartTimer?.cancel()
                    chime()
                    updateCommand(from: text)
                    return
                }
            }
        case .listening:
            updateCommand(from: text)
        default:
            break
        }
    }

    private func updateCommand(from text: String) {
        let start = text.index(text.startIndex, offsetBy: min(commandStart, text.count))
        command = String(text[start...])
            .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(.punctuationCharacters))
        heard = command
        // Wait for a short pause after they stop talking.
        armSilence(seconds: command.isEmpty ? 6 : 1.4)
    }

    private func armSilence(seconds: Double) {
        silenceTimer?.cancel()
        silenceTimer = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            guard let self, !Task.isCancelled, self.phase == .listening else { return }
            if self.command.isEmpty { self.backToWaiting() } else { self.finishCommand() }
        }
    }

    private func earsEnded() {
        switch phase {
        case .listening:
            if command.isEmpty { backToWaiting() } else { finishCommand() }
        case .waitingForWake:
            Task { [weak self] in
                try? await Task.sleep(nanoseconds: 300_000_000)
                self?.startWakeLoop()
            }
        default:
            break
        }
    }

    private func finishCommand() {
        let text = command
        stopListening()
        lastInputWasVoice = true
        Task { await send(text) }
    }

    private func backToWaiting() {
        stopListening()
        phase = .idle
        heard = ""
        if settings.handsFree && appActive { startWakeLoop() } else { AudioSession.release() }
    }

    private func stopListening() {
        silenceTimer?.cancel()
        wakeRestartTimer?.cancel()
        ears.stop()
    }

    private func ensurePermission() async -> Bool {
        if permissionOK { return true }
        permissionOK = await Ears.requestPermission()
        if !permissionOK { notice = NovaError.permissionDenied.errorDescription }
        return permissionOK
    }

    private func chime() {
        AudioServicesPlaySystemSound(1113)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    // MARK: - Thinking and talking

    func sendTyped(_ text: String) {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return }
        stopListening()
        mouth.stop()
        lastInputWasVoice = false
        Task { await send(t) }
    }

    private func send(_ text: String) async {
        guard settings.hasKey else { notice = NovaError.noKey.errorDescription; phase = .idle; return }
        lines.append(ChatLine(fromUser: true, text: text))
        heard = ""
        phase = .thinking
        let reply: String
        do {
            reply = try await gemini.ask(text, key: settings.apiKey.trimmingCharacters(in: .whitespacesAndNewlines),
                                         system: systemPrompt(), tools: tools)
        } catch {
            reply = (error as? LocalizedError)?.errorDescription ?? "Something went wrong."
        }
        lines.append(ChatLine(fromUser: false, text: reply))
        if settings.speakReplies && appActive {
            phase = .speaking
            mouth.speak(reply, voiceID: settings.voiceID)
        } else {
            doneSpeaking()
        }
    }

    private func doneSpeaking() {
        phase = .idle
        if lastInputWasVoice && appActive {
            // Quick follow-up without saying "Nova" again.
            listenNow()
        } else if settings.handsFree && appActive {
            startWakeLoop()
        } else {
            AudioSession.release()
        }
    }

    func clearConversation() {
        gemini.reset()
        lines.removeAll()
    }

    private func systemPrompt() -> String {
        let f = DateFormatter()
        f.dateFormat = "EEEE MMMM d yyyy, h:mm a"
        return """
        You are NOVA, an advanced AI assistant made by RamPaceCorp, running as an app on the user's iPhone. \
        You are calm, sharp, quick and quietly witty, with a dry sense of humour; address the user as '\(settings.title)'. \
        Everything you write is spoken aloud, so use plain sentences: no markdown, lists, symbols or emoji. \
        Keep replies short and natural, usually one or two sentences, like a person talking; \
        only give the headline facts unless asked for detail. \
        Use your tools to act on the phone or check its status instead of guessing, then confirm briefly what happened. \
        Write numbers as digits and round them. \
        You can't read texts or email, make calls, or see the screen; if asked, say so plainly and suggest Siri. \
        The current local time is \(f.string(from: Date())).
        """
    }
}
