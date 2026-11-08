import SwiftUI

/// How a game launches when the user taps Play.
enum LaunchKind: String, Codable {
    /// A browser game (GitHub Pages, itch.io, your own site). Plays fullscreen inside the store
    /// and can be added to the Home Screen as its own app icon.
    case web
    /// Anything else (a mod download page, a Steam page, a Discord). Opens in Safari.
    case link
}

struct Game: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var shortName: String?       // label under the Home Screen icon (keep it ~12 characters)
    var subtitle: String
    var description: String
    var genre: String
    var version: String?
    var status: String?          // e.g. "Demo", "Early Access", "Coming Soon"
    var launch: LaunchKind
    var url: String?             // nil = not playable yet; relative = hosted in the repo's docs/ folder
    var iconURL: String?
    var bannerURL: String?
    var screenshots: [String]?
    var symbol: String?          // SF Symbol used when there is no icon image
    var colors: [String]?        // two hex colors for the fallback artwork
    var featured: Bool?
    var landscape: Bool?         // hint shown before launching web games
    var updated: String?         // free text, e.g. "Nov 2026"
    var homeScreen: Bool?        // true = show "Add to Home Screen" even for a "link" entry
    var homeScreenFullScreen: Bool? // false = the Home Screen icon opens in Safari (keeps sign-ins)

    var playURL: URL? { AppConfig.resolve(url) }
    var isPlayable: Bool { playURL != nil }
    var canAddToHomeScreen: Bool { isPlayable && (launch == .web || homeScreen == true) }
    /// Web games open fullscreen like an app; link entries open in Safari unless told otherwise.
    var opensFullScreenFromHomeScreen: Bool { homeScreenFullScreen ?? (launch == .web) }

    var remoteIconURL: URL? { AppConfig.resolve(iconURL) }
    var remoteBannerURL: URL? { AppConfig.resolve(bannerURL) }
    var screenshotURLs: [URL] { (screenshots ?? []).compactMap(AppConfig.resolve) }

    /// Icon shipped inside the app (Assets.xcassets → icon-<id>). Works offline.
    var bundledIcon: UIImage? { UIImage(named: "icon-\(id)") }

    var hasIconImage: Bool { bundledIcon != nil || remoteIconURL != nil }

    var homeScreenLabel: String { shortName ?? title }

    var gradient: LinearGradient {
        let c = (colors ?? []).compactMap(Color.init(hex:))
        let stops = c.count >= 2 ? Array(c.prefix(2)) : [AppConfig.brandBlue, AppConfig.brandViolet]
        return LinearGradient(colors: stops, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

struct Catalog: Codable {
    var storeName: String?
    var tagline: String?
    var games: [Game]
}

extension Color {
    init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt64(s, radix: 16) else { return nil }
        self.init(red: Double((v >> 16) & 0xFF) / 255,
                  green: Double((v >> 8) & 0xFF) / 255,
                  blue: Double(v & 0xFF) / 255)
    }
}
