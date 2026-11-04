import SwiftUI

@main
struct GameStoreApp: App {
    @StateObject private var store = CatalogStore()
    @StateObject private var installer = HomeScreenInstaller()
    @State private var showSplash = true

    var body: some Scene {
        WindowGroup {
            ZStack {
                RootView()
                if showSplash {
                    SplashView().transition(.opacity)
                }
            }
            .environmentObject(store)
            .environmentObject(installer)
            .preferredColorScheme(.dark)
            .task {
                await store.refresh()
            }
            .task {
                try? await Task.sleep(nanoseconds: 1_200_000_000)
                withAnimation(.easeOut(duration: 0.4)) { showSplash = false }
            }
        }
    }
}

struct RootView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "sparkles") }
            GamesView()
                .tabItem { Label("Games", systemImage: "gamecontroller.fill") }
            SearchView()
                .tabItem { Label("Search", systemImage: "magnifyingglass") }
        }
    }
}

/// RamPace logo shown for a moment when the app opens.
struct SplashView: View {
    @State private var appeared = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 22) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 170)
                    .shadow(color: AppConfig.brandBlue.opacity(0.5), radius: 24)
                    .scaleEffect(appeared ? 1 : 0.85)
                Text("RAMPACE GAMES")
                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                    .tracking(2)
                    .foregroundStyle(AppConfig.brandBlue)
                Text("a \(AppConfig.companyName) company")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .opacity(appeared ? 1 : 0)
        }
        .onAppear { withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) { appeared = true } }
    }
}
