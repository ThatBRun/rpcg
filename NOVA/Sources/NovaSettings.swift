import SwiftUI
import Security
import AVFoundation

/// NOVA's settings. The Gemini key lives in the iPhone Keychain, never in the app's code.
@MainActor
final class NovaSettings: ObservableObject {
    static let shared = NovaSettings()

    @Published var apiKey: String {
        didSet { Keychain.set(apiKey.trimmingCharacters(in: .whitespacesAndNewlines), for: "gemini_api_key") }
    }
    @Published var callMe: String {
        didSet { UserDefaults.standard.set(callMe, forKey: "callMe") }
    }
    @Published var speakReplies: Bool {
        didSet { UserDefaults.standard.set(speakReplies, forKey: "speakReplies") }
    }
    @Published var handsFree: Bool {
        didSet { UserDefaults.standard.set(handsFree, forKey: "handsFree") }
    }
    @Published var voiceID: String {
        didSet { UserDefaults.standard.set(voiceID, forKey: "voiceID") }
    }

    var hasKey: Bool { !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    var title: String {
        let t = callMe.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? "sir" : t
    }

    private init() {
        let d = UserDefaults.standard
        apiKey = Keychain.get("gemini_api_key") ?? ""
        callMe = d.string(forKey: "callMe") ?? "sir"
        speakReplies = d.object(forKey: "speakReplies") as? Bool ?? true
        handsFree = d.object(forKey: "handsFree") as? Bool ?? true
        voiceID = d.string(forKey: "voiceID") ?? ""
    }

    /// English voices installed on this iPhone, best first.
    static var englishVoices: [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language.hasPrefix("en") }
            .sorted { rank($0) > rank($1) }
    }

    static func rank(_ v: AVSpeechSynthesisVoice) -> Int {
        var r = v.quality.rawValue * 10
        if v.language == "en-GB" { r += 5 }
        if v.gender == .female { r += 2 }
        return r
    }
}

enum Keychain {
    private static let service = "com.rampacecorp.nova"

    static func get(_ account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func set(_ value: String, for account: String) {
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(base as CFDictionary)
        guard !value.isEmpty, let data = value.data(using: .utf8) else { return }
        var add = base
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }
}
