import SwiftUI

struct GameDetailView: View {
    let game: Game
    @State private var expanded = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                GameBanner(game: game)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                HStack(alignment: .top, spacing: 16) {
                    GameIcon(game: game, size: 110)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(game.title).font(.title2.bold())
                        Text(game.subtitle).font(.subheadline).foregroundStyle(.secondary)
                        Text(AppConfig.companyName)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color.accentColor)
                        Spacer(minLength: 8)
                        PlayButton(game: game, prominent: true)
                    }
                }

                AddToHomeScreenButton(game: game)

                infoStrip

                if !game.screenshotURLs.isEmpty {
                    Text("Preview").font(.title3.bold())
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(game.screenshotURLs, id: \.self) { u in
                                AsyncImage(url: u) { img in
                                    img.resizable().scaledToFill()
                                } placeholder: {
                                    Rectangle().fill(game.gradient).opacity(0.4)
                                }
                                .frame(width: 300, height: 170)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("About").font(.title3.bold())
                    Text(game.description)
                        .lineLimit(expanded ? nil : 5)
                        .foregroundStyle(.secondary)
                    if !expanded && game.description.count > 220 {
                        Button("more") { withAnimation { expanded = true } }
                            .font(.subheadline.bold())
                    }
                }

                if game.launch == .web, game.landscape == true {
                    Label("Best played in landscape. Rotate your device after launching.",
                          systemImage: "rotate.right")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private var infoStrip: some View {
        HStack(spacing: 0) {
            info("GENRE", game.genre)
            Divider().frame(height: 34)
            info("VERSION", game.version ?? "—")
            Divider().frame(height: 34)
            info("STATUS", game.status ?? "Released")
            if let updated = game.updated {
                Divider().frame(height: 34)
                info("UPDATED", updated)
            }
        }
        .padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.06)))
    }

    private func info(_ label: String, _ value: String) -> some View {
        VStack(spacing: 4) {
            Text(label).font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary)
            Text(value).font(.subheadline.bold()).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }
}
