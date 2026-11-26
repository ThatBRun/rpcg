import SwiftUI

extension Color {
    static let novaCyan = Color(red: 95 / 255, green: 211 / 255, blue: 243 / 255)   // #5FD3F3
    static let novaDeep = Color(red: 5 / 255, green: 8 / 255, blue: 14 / 255)       // #05080E
}

struct ContentView: View {
    @EnvironmentObject var brain: NovaBrain
    @EnvironmentObject var settings: NovaSettings
    @State private var typed = ""
    @State private var showSettings = false
    @FocusState private var typing: Bool

    var body: some View {
        ZStack {
            background
            if settings.hasKey {
                main
            } else {
                KeySetupView()
            }
        }
        .sheet(isPresented: $showSettings, onDismiss: { brain.settingsChanged() }) {
            SettingsView().environmentObject(settings).environmentObject(brain)
        }
    }

    private var background: some View {
        RadialGradient(colors: [Color(red: 0.06, green: 0.16, blue: 0.24), .novaDeep],
                       center: .top, startRadius: 40, endRadius: 700)
            .ignoresSafeArea()
    }

    private var main: some View {
        VStack(spacing: 0) {
            header
            NovaOrb(phase: brain.phase)
                .frame(width: 210, height: 210)
                .padding(.top, 6)
                .contentShape(Circle())
                .onTapGesture { brain.micTapped() }
                .accessibilityLabel("Talk to NOVA")
                .accessibilityAddTraits(.isButton)

            Text(statusLine)
                .font(.system(.footnote, design: .monospaced).weight(.semibold))
                .tracking(1.5)
                .foregroundStyle(Color.novaCyan.opacity(0.85))
                .padding(.top, 10)

            Text(brain.heard.isEmpty ? " " : "“\(brain.heard)”")
                .font(.title3.weight(.medium))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white)
                .lineLimit(3)
                .padding(.horizontal, 24)
                .padding(.top, 6)
                .frame(minHeight: 60)

            if let notice = brain.notice {
                Label(notice, systemImage: "exclamationmark.triangle.fill")
                    .font(.footnote)
                    .foregroundStyle(.orange)
                    .padding(.horizontal)
            }

            transcript
            inputBar
        }
    }

    private var header: some View {
        HStack {
            Text("NOVA")
                .font(.system(size: 22, weight: .heavy, design: .rounded))
                .tracking(6)
                .foregroundStyle(Color.novaCyan)
            Spacer()
            Button { showSettings = true } label: {
                Image(systemName: "gearshape.fill")
                    .font(.title3)
                    .foregroundStyle(.white.opacity(0.75))
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Settings")
        }
        .padding(.horizontal, 18)
        .padding(.top, 4)
    }

    private var statusLine: String {
        switch brain.phase {
        case .idle: return settings.handsFree ? "TAP TO TALK" : "TAP TO TALK"
        case .waitingForWake: return "SAY “NOVA”"
        case .listening: return "LISTENING…"
        case .thinking: return "THINKING…"
        case .speaking: return "SPEAKING · TAP TO INTERRUPT"
        }
    }

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    ForEach(brain.lines) { line in
                        ChatBubble(line: line).id(line.id)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: brain.lines) { _, lines in
                if let last = lines.last {
                    withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }
        }
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Type to NOVA", text: $typed)
                .focused($typing)
                .submitLabel(.send)
                .onSubmit(sendTyped)
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(Capsule().fill(Color.white.opacity(0.08)))
                .overlay(Capsule().strokeBorder(Color.novaCyan.opacity(0.25)))
            Button {
                if typed.trimmingCharacters(in: .whitespaces).isEmpty { brain.micTapped() } else { sendTyped() }
            } label: {
                Image(systemName: typed.trimmingCharacters(in: .whitespaces).isEmpty
                      ? (brain.phase == .listening ? "stop.fill" : "mic.fill") : "arrow.up")
                    .font(.headline)
                    .foregroundStyle(Color.novaDeep)
                    .frame(width: 46, height: 46)
                    .background(Circle().fill(Color.novaCyan))
            }
            .accessibilityLabel(typed.isEmpty ? "Talk" : "Send")
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 10)
        .padding(.top, 4)
    }

    private func sendTyped() {
        brain.sendTyped(typed)
        typed = ""
        typing = false
    }
}

struct ChatBubble: View {
    let line: ChatLine

    var body: some View {
        HStack {
            if line.fromUser { Spacer(minLength: 40) }
            Text(line.text)
                .font(.callout)
                .foregroundStyle(line.fromUser ? Color.novaDeep : .white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(line.fromUser ? AnyShapeStyle(Color.novaCyan) : AnyShapeStyle(Color.white.opacity(0.09)))
                )
                .textSelection(.enabled)
            if !line.fromUser { Spacer(minLength: 40) }
        }
    }
}

/// The glowing ring from NOVA's icon, animated by what she's doing.
struct NovaOrb: View {
    let phase: NovaBrain.Phase

    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            let active = phase == .listening || phase == .speaking
            let pulse = active ? 1 + 0.06 * sin(t * (phase == .speaking ? 9 : 5)) : 1 + 0.015 * sin(t * 1.5)
            let spin = Angle.degrees((t * (phase == .thinking ? 160 : 24)).truncatingRemainder(dividingBy: 360))

            ZStack {
                Circle()
                    .fill(RadialGradient(colors: [Color.novaCyan.opacity(active ? 0.35 : 0.18), .clear],
                                         center: .center, startRadius: 10, endRadius: 120))
                    .scaleEffect(pulse * 1.15)
                Circle()
                    .stroke(Color.novaCyan.opacity(0.75), lineWidth: 5)
                    .padding(8)
                Circle()
                    .stroke(Color.novaCyan.opacity(0.55),
                            style: StrokeStyle(lineWidth: 12, lineCap: .round, dash: [3, 7]))
                    .padding(30)
                    .rotationEffect(spin)
                Circle()
                    .stroke(Color.novaCyan.opacity(0.35), lineWidth: 3)
                    .padding(52)
                Circle()
                    .fill(RadialGradient(colors: [.white, Color.novaCyan, Color.novaCyan.opacity(0.2)],
                                         center: .center, startRadius: 2, endRadius: 44))
                    .frame(width: 72, height: 72)
                    .scaleEffect(pulse)
                    .shadow(color: Color.novaCyan.opacity(0.9), radius: active ? 24 : 12)
            }
            .opacity(phase == .idle ? 0.8 : 1)
        }
    }
}
