import AVFoundation
import Speech

/// Listens through the microphone and turns speech into text, live.
@MainActor
final class Ears {
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var generation = 0
    private(set) var running = false

    /// Called with the full text heard so far in this session.
    var onTranscript: ((String) -> Void)?
    /// Called when the session ends by itself (pause, time limit, error).
    var onEnded: (() -> Void)?

    nonisolated static func requestPermission() async -> Bool {
        let speech = await withCheckedContinuation { (c: CheckedContinuation<Bool, Never>) in
            SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) }
        }
        guard speech else { return false }
        return await AVAudioApplication.requestRecordPermission()
    }

    func start() throws {
        stop()
        guard let recognizer, recognizer.isAvailable else { throw NovaError.speechUnavailable }

        try AudioSession.activate()
        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        req.addsPunctuation = false
        request = req

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0 else { throw NovaError.speechUnavailable }
        Self.feed(input, format: format, into: req)
        engine.prepare()
        try engine.start()
        running = true

        generation += 1
        let gen = generation
        task = Self.recognize(with: recognizer, request: req) { [weak self] text, done in
            guard let self, gen == self.generation else { return }
            if let text { self.onTranscript?(text) }
            if done {
                self.teardown()
                self.onEnded?()
            }
        }
    }

    /// Audio arrives on a background thread, so this must not be tied to the main thread.
    nonisolated private static func feed(_ input: AVAudioInputNode, format: AVAudioFormat,
                                         into request: SFSpeechAudioBufferRecognitionRequest) {
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
    }

    nonisolated private static func recognize(with recognizer: SFSpeechRecognizer,
                                              request: SFSpeechAudioBufferRecognitionRequest,
                                              update: @escaping @MainActor (String?, Bool) -> Void) -> SFSpeechRecognitionTask {
        recognizer.recognitionTask(with: request) { result, error in
            let text = result?.bestTranscription.formattedString
            let done = error != nil || (result?.isFinal ?? false)
            Task { @MainActor in update(text, done) }
        }
    }

    /// Stop on purpose (no onEnded callback).
    func stop() {
        generation += 1
        teardown()
    }

    private func teardown() {
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        running = false
    }
}

/// Speaks NOVA's replies out loud.
@MainActor
final class Mouth: NSObject, AVSpeechSynthesizerDelegate {
    private let synth = AVSpeechSynthesizer()
    var onFinished: (() -> Void)?

    override init() {
        super.init()
        synth.delegate = self
    }

    var isSpeaking: Bool { synth.isSpeaking }

    func speak(_ text: String, voiceID: String) {
        try? AudioSession.activate()
        let utterance = AVSpeechUtterance(string: Self.clean(text))
        utterance.voice = AVSpeechSynthesisVoice(identifier: voiceID) ?? NovaSettings.englishVoices.first
        utterance.rate = 0.52
        utterance.postUtteranceDelay = 0.05
        synth.speak(utterance)
    }

    /// Stopping early triggers didCancel (not didFinish), so no follow-up listening starts.
    func stop() {
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in self.onFinished?() }
    }

    /// Strip anything that sounds odd when read aloud.
    static func clean(_ text: String) -> String {
        var t = text
        for s in ["**", "*", "#", "`", "_", "•"] { t = t.replacingOccurrences(of: s, with: "") }
        return t
    }
}

enum AudioSession {
    static func activate() throws {
        let s = AVAudioSession.sharedInstance()
        try s.setCategory(.playAndRecord, mode: .default,
                          options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP, .duckOthers])
        try s.setActive(true)
    }

    static func release() {
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
