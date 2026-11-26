import AppIntents

/// "Hey Siri, NOVA" — opens NOVA and starts listening right away.
struct TalkToNovaIntent: AppIntent {
    static var title: LocalizedStringResource = "Talk to NOVA"
    static var description = IntentDescription("Opens NOVA and starts listening.")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        NovaBrain.shared.activatedBySiri()
        return .result()
    }
}

struct NovaShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TalkToNovaIntent(),
            phrases: [
                "\(.applicationName)",
                "Hey \(.applicationName)",
                "Talk to \(.applicationName)",
                "Ask \(.applicationName)",
                "Open \(.applicationName) and listen",
            ],
            shortTitle: "Talk to NOVA",
            systemImageName: "waveform.circle"
        )
    }
}
