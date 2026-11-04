import SwiftUI
import WebKit

/// Plays a browser game fullscreen inside the store.
struct GamePlayerView: View {
    let game: Game
    let url: URL
    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = true
    @State private var reloadToken = UUID()

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()

            GameWebView(url: url, isLoading: $isLoading)
                .id(reloadToken)
                .ignoresSafeArea()

            if isLoading {
                VStack(spacing: 14) {
                    GameIcon(game: game, size: 90)
                    Text(game.title).font(.headline).foregroundStyle(.white)
                    ProgressView().tint(.white)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.black)
                .transition(.opacity)
            }

            Menu {
                Button { reloadToken = UUID(); isLoading = true } label: {
                    Label("Restart", systemImage: "arrow.clockwise")
                }
                Button(role: .destructive) { dismiss() } label: {
                    Label("Quit Game", systemImage: "xmark")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(.black.opacity(0.45)))
            }
            .padding(.leading, 12)
            .padding(.top, 6)
            .opacity(0.8)
        }
        .animation(.easeOut(duration: 0.25), value: isLoading)
        .statusBarHidden()
        .persistentSystemOverlays(.hidden)
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
    }
}

struct GameWebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()   // keeps save games / localStorage between launches
        config.preferences.isElementFullscreenEnabled = true

        // Stop pinch-zoom and double-tap zoom from fighting the game's controls.
        let noZoom = """
        var m = document.createElement('meta'); m.name = 'viewport';
        m.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
        document.head.appendChild(m);
        document.documentElement.style.webkitUserSelect = 'none';
        document.documentElement.style.webkitTouchCallout = 'none';
        """
        config.userContentController.addUserScript(
            WKUserScript(source: noZoom, injectionTime: .atDocumentEnd, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.backgroundColor = .black
        web.scrollView.bounces = false
        web.scrollView.isScrollEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsBackForwardNavigationGestures = false
        web.load(URLRequest(url: url))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let parent: GameWebView
        init(_ parent: GameWebView) { self.parent = parent }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { self.parent.isLoading = false }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
                     withError error: Error) {
            parent.isLoading = false
        }

        // Links that try to open a new window (target=_blank) load in place.
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.targetFrame == nil { webView.load(navigationAction.request) }
            return nil
        }

        // Let games use alert()/confirm() without silently hanging.
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            present(UIAlertController(title: nil, message: message, preferredStyle: .alert),
                    actions: [UIAlertAction(title: "OK", style: .default) { _ in completionHandler() }])
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            present(UIAlertController(title: nil, message: message, preferredStyle: .alert),
                    actions: [UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) },
                              UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) }])
        }

        private func present(_ alert: UIAlertController, actions: [UIAlertAction]) {
            actions.forEach(alert.addAction)
            let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene
            var top = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
            while let next = top?.presentedViewController { top = next }
            top?.present(alert, animated: true)
        }
    }
}
