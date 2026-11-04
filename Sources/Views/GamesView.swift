import SwiftUI

struct GamesView: View {
    @EnvironmentObject var store: CatalogStore
    @State private var genre: String? = nil

    private var shown: [Game] {
        guard let genre else { return store.games }
        return store.games.filter { $0.genre == genre }
    }

    var body: some View {
        NavigationStack {
            List {
                if store.genres.count > 1 {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            chip("All", selected: genre == nil) { genre = nil }
                            ForEach(store.genres, id: \.self) { g in
                                chip(g, selected: genre == g) { genre = g }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .listRowSeparator(.hidden)
                }
                ForEach(shown) { game in
                    NavigationLink(value: game) { GameRow(game: game) }
                }
            }
            .listStyle(.plain)
            .refreshable { await store.refresh() }
            .navigationTitle("Games")
            .navigationDestination(for: Game.self) { GameDetailView(game: $0) }
        }
    }

    private func chip(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(Capsule().fill(selected ? Color.accentColor : Color.white.opacity(0.1)))
                .foregroundStyle(selected ? .white : .primary)
        }
        .buttonStyle(.plain)
    }
}

struct SearchView: View {
    @EnvironmentObject var store: CatalogStore
    @State private var query = ""

    private var results: [Game] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return store.games }
        return store.games.filter {
            "\($0.title) \($0.subtitle) \($0.genre) \($0.description)".lowercased().contains(q)
        }
    }

    var body: some View {
        NavigationStack {
            List(results) { game in
                NavigationLink(value: game) { GameRow(game: game) }
            }
            .listStyle(.plain)
            .overlay {
                if results.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "magnifyingglass").font(.largeTitle)
                        Text("No games match \u{201C}\(query)\u{201D}")
                    }
                    .foregroundStyle(.secondary)
                }
            }
            .searchable(text: $query, prompt: "Games, genres…")
            .navigationTitle("Search")
            .navigationDestination(for: Game.self) { GameDetailView(game: $0) }
        }
    }
}
