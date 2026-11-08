import SwiftUI

/// "Add to Home Screen" button on a game's page, plus the step-by-step sheet.
struct AddToHomeScreenButton: View {
    let game: Game
    @EnvironmentObject var installer: HomeScreenInstaller
    @State private var showGuide = false

    var body: some View {
        if game.canAddToHomeScreen {
            Button { showGuide = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: installer.wasAdded(game) ? "checkmark.circle.fill" : "plus.app.fill")
                    Text(installer.wasAdded(game) ? "On Home Screen · Add Again" : "Add to Home Screen")
                        .fontWeight(.semibold)
                }
                .font(.subheadline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Color.white.opacity(0.08)))
                .foregroundStyle(Color.accentColor)
            }
            .buttonStyle(.plain)
            .sheet(isPresented: $showGuide) {
                AddToHomeScreenGuide(game: game)
                    .environmentObject(installer)
                    .presentationDetents([.large])
            }
        }
    }
}

struct AddToHomeScreenGuide: View {
    let game: Game
    @EnvironmentObject var installer: HomeScreenInstaller
    @Environment(\.dismiss) private var dismiss
    @State private var opened = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    preview

                    VStack(alignment: .leading, spacing: 16) {
                        step(1, "Tap **Get Started**, then **Allow** to download the \(game.homeScreenLabel) profile, and tap **Done**.")
                        step(2, "Open the **Settings** app and tap **Profile Downloaded** near the top.")
                        step(3, "Tap **Install** (top right), enter your passcode, then **Install** and **Done**.")
                        step(4, game.opensFullScreenFromHomeScreen ? "\(game.homeScreenLabel) is now on your Home Screen. It opens fullscreen like a normal app." : "\(game.homeScreenLabel) is now on your Home Screen. It opens in Safari, so you stay signed in.")
                    }
                    .padding(18)
                    .background(RoundedRectangle(cornerRadius: 18).fill(Color.white.opacity(0.06)))

                    VStack(alignment: .leading, spacing: 8) {
                        note("checkmark.seal", "Settings will say **Not Verified**. That's normal for games installed outside the App Store.")
                        note("arrow.triangle.2.circlepath", "It never expires, and it doesn't use one of your 3 sideload slots.")
                        note("externaldrive", "Saves on the Home Screen version are kept separately from playing inside RamPace, except for games with online accounts.")
                        note("trash", "To remove it, hold the icon and tap **Remove App**.")
                    }
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                    if let err = installer.errorMessage {
                        Text(err).font(.footnote).foregroundStyle(.red)
                    }

                    VStack(spacing: 10) {
                        Button {
                            Task {
                                await installer.prepare(game)
                                opened = installer.errorMessage == nil
                            }
                        } label: {
                            Group {
                                if installer.preparingGameID == game.id {
                                    ProgressView().tint(.white)
                                } else {
                                    Text(opened ? "Download Again" : "Get Started").fontWeight(.bold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Capsule().fill(Color.accentColor))
                            .foregroundStyle(.white)
                        }
                        .buttonStyle(.plain)
                        .disabled(installer.preparingGameID != nil)

                        if opened {
                            Button("Nothing happened? Use the Safari app instead") {
                                installer.openInSafariApp()
                            }
                            .font(.footnote.weight(.semibold))
                            .padding(.top, 2)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Add to Home Screen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Close") { dismiss() } }
            }
            .fullScreenCover(item: $installer.safariLink) { link in
                SafariView(url: link.url).ignoresSafeArea()
            }
        }
    }

    /// Mock of how the icon will look on the Home Screen.
    private var preview: some View {
        VStack(spacing: 8) {
            GameIcon(game: game, size: 96)
                .shadow(color: .black.opacity(0.4), radius: 12, y: 6)
            Text(game.homeScreenLabel)
                .font(.caption)
                .foregroundStyle(.white)
        }
        .padding(.vertical, 26)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(LinearGradient(colors: [AppConfig.brandBlue.opacity(0.55), AppConfig.brandViolet.opacity(0.35)],
                                     startPoint: .topLeading, endPoint: .bottomTrailing))
        )
    }

    private func step(_ n: Int, _ text: LocalizedStringKey) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(n)")
                .font(.subheadline.bold())
                .frame(width: 26, height: 26)
                .background(Circle().fill(Color.accentColor))
                .foregroundStyle(.white)
            Text(text).font(.subheadline)
            Spacer(minLength: 0)
        }
    }

    private func note(_ symbol: String, _ text: LocalizedStringKey) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: symbol).frame(width: 18)
            Text(text)
        }
    }
}
