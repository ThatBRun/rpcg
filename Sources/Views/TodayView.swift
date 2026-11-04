import SwiftUI

struct TodayView: View {
    @EnvironmentObject var store: CatalogStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header

                    if let err = store.lastError {
                        Label(err, systemImage: "wifi.exclamationmark")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)
                    }

                    ForEach(store.featured) { game in
                        NavigationLink(value: game) {
                            FeaturedCard(game: game)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal)
                    }

                    if store.games.count > store.featured.count {
                        Text("All Games")
                            .font(.title2.bold())
                            .padding(.horizontal)
                        VStack(spacing: 0) {
                            ForEach(store.games) { game in
                                NavigationLink(value: game) { GameRow(game: game) }
                                    .buttonStyle(.plain)
                                Divider().padding(.leading, 78)
                            }
                        }
                        .padding(.horizontal)
                    }

                    footer
                }
                .padding(.bottom, 30)
            }
            .refreshable { await store.refresh() }
            .navigationDestination(for: Game.self) { GameDetailView(game: $0) }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 14) {
            VStack(alignment: .leading, spacing: 2) {
                Text(Date.now.formatted(.dateTime.weekday(.wide).month(.wide).day()).uppercased())
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
                Text(store.storeName)
                    .font(.largeTitle.bold())
                if let tagline = store.catalog.tagline {
                    Text(tagline).font(.subheadline).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(height: 64)
                .shadow(color: AppConfig.brandBlue.opacity(0.35), radius: 10)
        }
        .padding(.horizontal)
        .padding(.top, 12)
    }

    private var footer: some View {
        VStack(spacing: 6) {
            Image("Logo").resizable().scaledToFit().frame(height: 28).opacity(0.6)
            Text("© \(Calendar.current.component(.year, from: .now).formatted(.number.grouping(.never))) \(AppConfig.companyName)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 10)
    }
}

struct FeaturedCard: View {
    let game: Game

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                GameBanner(game: game)
                    .frame(height: 260)
                LinearGradient(colors: [.clear, .black.opacity(0.75)],
                               startPoint: .center, endPoint: .bottom)
                VStack(alignment: .leading, spacing: 4) {
                    Text((game.status ?? game.genre).uppercased())
                        .font(.caption.weight(.heavy))
                        .foregroundStyle(.white.opacity(0.75))
                    Text(game.title)
                        .font(.system(size: 30, weight: .heavy))
                        .foregroundStyle(.white)
                }
                .padding(18)
            }
            HStack(spacing: 12) {
                GameIcon(game: game, size: 44)
                VStack(alignment: .leading) {
                    Text(game.title).font(.subheadline.bold())
                    Text(game.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer()
                PlayButton(game: game)
            }
            .padding(14)
            .background(.ultraThinMaterial)
        }
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.35), radius: 14, y: 8)
    }
}
