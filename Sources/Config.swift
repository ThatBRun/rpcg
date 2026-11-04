import SwiftUI

/// Edit these to brand the store.
enum AppConfig {
    // ─────────────────────────────────────────────────────────────
    //  1. Put your GitHub username here (the only required edit).
    // ─────────────────────────────────────────────────────────────
    static let githubUsername = "ThatBRun"
    static let repoName = "rpcg"

    /// Shown at the top of the Today tab. games.json can override it with "storeName".
    static let storeName = "RamPace Games"

    /// Publisher shown on every game page, the footer and home-screen installs.
    static let companyName = "RamPaceCorp"
    static let bundlePrefix = "com.rampacecorp"

    /// Brand colors from the RamPace logo.
    static let brandBlue = Color(red: 56 / 255, green: 182 / 255, blue: 255 / 255)      // #38B6FF
    static let brandViolet = Color(red: 132 / 255, green: 154 / 255, blue: 255 / 255)   // #849AFF
    static let brandLavender = Color(red: 221 / 255, green: 227 / 255, blue: 255 / 255) // #DDE3FF

    // Everything below is worked out from the username — no need to touch it.

    private static var isConfigured: Bool { !githubUsername.contains("YOUR-") }

    /// Where the games and icons are hosted (GitHub Pages, the repo's docs/ folder).
    /// Game "url" and "iconURL" values in games.json that don't start with https://
    /// are relative to this address.
    static var siteBaseURL: URL? {
        guard isConfigured else { return nil }
        return URL(string: "https://\(githubUsername.lowercased()).github.io/\(repoName)/")
    }

    /// The live game list. The app reads it on launch and pull-to-refresh, so you can
    /// add or update games WITHOUT rebuilding or re-sideloading the app.
    static var remoteCatalogURL: URL? {
        guard isConfigured else { return nil }
        return URL(string: "https://raw.githubusercontent.com/\(githubUsername)/\(repoName)/main/Resources/games.json")
    }

    /// Turns a games.json address into a full URL ("games/bm27/index.html" → GitHub Pages).
    static func resolve(_ string: String?) -> URL? {
        guard let s = string?.trimmingCharacters(in: .whitespaces), !s.isEmpty else { return nil }
        if s.lowercased().hasPrefix("http://") || s.lowercased().hasPrefix("https://") {
            return URL(string: s)
        }
        guard let base = siteBaseURL else { return nil }
        let encoded = s.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? s
        return URL(string: encoded, relativeTo: base)?.absoluteURL
    }
}
