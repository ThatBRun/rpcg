import SwiftUI

/// Loads the game list: bundled copy first (works offline), then the live copy from the web.
@MainActor
final class CatalogStore: ObservableObject {
    @Published private(set) var catalog: Catalog = Catalog(games: [])
    @Published private(set) var isRefreshing = false
    @Published private(set) var lastError: String?

    private let cacheURL = FileManager.default
        .urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("games-cache.json")

    var storeName: String { catalog.storeName ?? AppConfig.storeName }
    var games: [Game] { catalog.games }
    var featured: [Game] {
        let f = games.filter { $0.featured == true }
        return f.isEmpty ? Array(games.prefix(3)) : f
    }
    var genres: [String] { Array(Set(games.map(\.genre))).sorted() }

    init() {
        if let cached = Self.decode(try? Data(contentsOf: cacheURL)) {
            catalog = cached
        } else if let url = Bundle.main.url(forResource: "games", withExtension: "json"),
                  let bundled = Self.decode(try? Data(contentsOf: url)) {
            catalog = bundled
        }
    }

    func refresh() async {
        guard let remote = AppConfig.remoteCatalogURL else { return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            var req = URLRequest(url: remote)
            req.cachePolicy = .reloadIgnoringLocalCacheData
            let (data, _) = try await URLSession.shared.data(for: req)
            guard let fresh = Self.decode(data) else {
                lastError = "The game list online couldn't be read."
                return
            }
            catalog = fresh
            lastError = nil
            try? data.write(to: cacheURL)
        } catch {
            lastError = "Couldn't reach the game list. Showing the saved copy."
        }
    }

    private static func decode(_ data: Data?) -> Catalog? {
        guard let data else { return nil }
        return try? JSONDecoder().decode(Catalog.self, from: data)
    }
}
