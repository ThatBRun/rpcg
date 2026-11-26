import SwiftUI
import AVFoundation

struct SettingsView: View {
    @EnvironmentObject var settings: NovaSettings
    @EnvironmentObject var brain: NovaBrain
    @Environment(\.dismiss) private var dismiss
    @State private var showKey = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Speak replies out loud", isOn: $settings.speakReplies)
                    Toggle("Hands-free: say “Nova”", isOn: $settings.handsFree)
                } footer: {
                    Text("Hands-free listens for “Nova” while the app is open and keeps the screen on. Apple doesn't let apps listen while closed, so use Siri for that (below).")
                }

                Section("Siri") {
                    Label("Say “Hey Siri, NOVA”", systemImage: "waveform.circle")
                    Text("Works anywhere, even from the lock screen. NOVA opens and starts listening. Open NOVA once after installing so Siri learns the phrase.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("You") {
                    TextField("What NOVA calls you", text: $settings.callMe)
                        .textInputAutocapitalization(.never)
                }

                Section("Voice") {
                    Picker("Voice", selection: $settings.voiceID) {
                        Text("Automatic (best British voice)").tag("")
                        ForEach(NovaSettings.englishVoices, id: \.identifier) { v in
                            Text("\(v.name) · \(v.language)\(v.quality == .default ? "" : " · HQ")").tag(v.identifier)
                        }
                    }
                    Button("Test voice") {
                        let synth = Self.tester
                        let u = AVSpeechUtterance(string: "Hello \(settings.title). NOVA online and ready.")
                        u.voice = AVSpeechSynthesisVoice(identifier: settings.voiceID) ?? NovaSettings.englishVoices.first
                        u.rate = 0.52
                        synth.speak(u)
                    }
                    Text("For a more natural voice, download one in iPhone Settings > Accessibility > Spoken Content > Voices > English, e.g. Serena (Premium).")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section {
                    HStack {
                        Group {
                            if showKey { TextField("Gemini API key", text: $settings.apiKey) }
                            else { SecureField("Gemini API key", text: $settings.apiKey) }
                        }
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        Button { showKey.toggle() } label: { Image(systemName: showKey ? "eye.slash" : "eye") }
                    }
                    Link("Get a free key at Google AI Studio", destination: URL(string: "https://aistudio.google.com/apikey")!)
                } header: {
                    Text("Brain")
                } footer: {
                    Text("Your key is stored only in this iPhone's Keychain.")
                }

                Section {
                    Button("Clear conversation", role: .destructive) { brain.clearConversation() }
                }

                Section {
                    Text("NOVA by RamPaceCorp · version 1.0")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
        }
    }

    private static let tester = AVSpeechSynthesizer()
}

/// First launch: paste a Gemini key.
struct KeySetupView: View {
    @EnvironmentObject var settings: NovaSettings
    @EnvironmentObject var brain: NovaBrain
    @State private var key = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                NovaOrb(phase: .idle)
                    .frame(width: 170, height: 170)
                    .padding(.top, 40)
                Text("NOVA")
                    .font(.system(size: 34, weight: .heavy, design: .rounded))
                    .tracking(10)
                    .foregroundStyle(Color.novaCyan)
                Text("NOVA runs on Google Gemini, which is free. Paste your Gemini API key to wake her up.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.8))
                    .padding(.horizontal, 30)

                VStack(spacing: 12) {
                    SecureField("Paste your Gemini API key", text: $key)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(14)
                        .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.08)))
                        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Color.novaCyan.opacity(0.3)))
                    Button {
                        settings.apiKey = key
                        brain.settingsChanged()
                    } label: {
                        Text("Start NOVA")
                            .font(.headline)
                            .foregroundStyle(Color.novaDeep)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Capsule().fill(Color.novaCyan))
                    }
                    .disabled(key.trimmingCharacters(in: .whitespaces).isEmpty)
                    Link("Get a free key at aistudio.google.com/apikey",
                         destination: URL(string: "https://aistudio.google.com/apikey")!)
                        .font(.footnote)
                        .tint(Color.novaCyan)
                }
                .padding(.horizontal, 28)

                Text("Your key stays on this iPhone, in its Keychain. It's the same kind of key your PC NOVA uses, so you can reuse that one.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(.horizontal, 30)
            }
        }
    }
}
