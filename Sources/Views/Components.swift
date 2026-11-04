import SwiftUI

/// The game's artwork: icon bundled in the app first, then iconURL, then generated art.
struct GameArtwork<Fallback: View>: View {
    let game: Game
    @ViewBuilder var fallback: () -> Fallback

    var body: some View {
        if let ui = game.bundledIcon {
            Image(uiImage: ui).resizable().scaledToFill()
        } else if let url = game.remoteIconURL {
            AsyncImage(url: url) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFill()
                } else {
                    fallback()
                }
            }
        } else {
            fallback()
        }
    }
}

/// Square app-style icon.
struct GameIcon: View {
    let game: Game
    var size: CGFloat = 64

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.225, style: .continuous)
                .fill(game.gradient)
            GameArtwork(game: game) { fallbackArt }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.225, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: size * 0.225, style: .continuous)
                .strokeBorder(.white.opacity(0.12), lineWidth: 0.5)
        )
    }

    private var fallbackArt: some View {
        Image(systemName: game.symbol ?? "gamecontroller.fill")
            .font(.system(size: size * 0.45, weight: .bold))
            .foregroundStyle(.white)
            .shadow(color: .black.opacity(0.3), radius: 2, y: 1)
    }
}

/// Wide artwork for featured cards and the detail header.
/// Uses bannerURL if set; otherwise a blurred, enlarged icon with the crisp icon on top.
struct GameBanner: View {
    let game: Game

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Rectangle().fill(game.gradient)
                if let url = game.remoteBannerURL {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else {
                            iconBackdrop(geo.size)
                        }
                    }
                } else {
                    iconBackdrop(geo.size)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .clipped()
    }

    @ViewBuilder
    private func iconBackdrop(_ size: CGSize) -> some View {
        if game.hasIconImage {
            ZStack {
                GameArtwork(game: game) { EmptyView() }
                    .frame(width: size.width, height: size.height)
                    .blur(radius: 28)
                    .scaleEffect(1.3)
                    .overlay(Color.black.opacity(0.35))
                GameIcon(game: game, size: min(size.height * 0.62, 150))
                    .shadow(color: .black.opacity(0.5), radius: 18, y: 8)
                    .rotationEffect(.degrees(-6))
                    .offset(x: size.width * 0.24, y: -size.height * 0.06)
            }
        } else {
            Image(systemName: game.symbol ?? "gamecontroller.fill")
                .font(.system(size: 110, weight: .black))
                .foregroundStyle(.white.opacity(0.18))
                .rotationEffect(.degrees(-12))
                .offset(x: 90, y: 10)
        }
    }
}

/// The App Store style pill button: PLAY / OPEN / SOON.
struct PlayButton: View {
    let game: Game
    var prominent = false
    @State private var showPlayer = false
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button(action: launch) {
            Text(label)
                .font(.system(size: prominent ? 17 : 15, weight: .bold))
                .padding(.horizontal, prominent ? 28 : 18)
                .padding(.vertical, prominent ? 10 : 6)
                .foregroundStyle(game.isPlayable ? (prominent ? .white : Color.accentColor) : .secondary)
                .background(
                    Capsule().fill(prominent && game.isPlayable
                                   ? AnyShapeStyle(Color.accentColor)
                                   : AnyShapeStyle(Color.white.opacity(0.12)))
                )
        }
        .buttonStyle(.plain)
        .disabled(!game.isPlayable)
        .fullScreenCover(isPresented: $showPlayer) {
            if let url = game.playURL {
                GamePlayerView(game: game, url: url)
            }
        }
    }

    private var label: String {
        guard game.isPlayable else { return "SOON" }
        return game.launch == .web ? "PLAY" : "OPEN"
    }

    private func launch() {
        guard let url = game.playURL else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        switch game.launch {
        case .web: showPlayer = true
        case .link: openURL(url)
        }
    }
}

/// One line in a list: icon, title, subtitle, play button.
struct GameRow: View {
    let game: Game

    var body: some View {
        HStack(spacing: 14) {
            GameIcon(game: game, size: 64)
            VStack(alignment: .leading, spacing: 3) {
                Text(game.title).font(.headline).lineLimit(1)
                Text(game.subtitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                if let status = game.status {
                    StatusTag(text: status)
                }
            }
            Spacer(minLength: 8)
            PlayButton(game: game)
        }
        .padding(.vertical, 6)
    }
}

struct StatusTag: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .heavy))
            .tracking(0.6)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Capsule().fill(Color.accentColor.opacity(0.2)))
            .foregroundStyle(Color.accentColor)
    }
}
