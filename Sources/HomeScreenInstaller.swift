import SwiftUI
import Network
import CryptoKit
import SafariServices

// Adds a web game to the iPhone Home Screen as its own app icon.
//
// How it works: the app builds a small iOS "Web Clip" profile for the game (name, icon,
// URL, open fullscreen), serves it from a tiny web server that only this phone can reach
// (127.0.0.1), and opens it in Safari. iOS then asks the player to install it in Settings.
// The result is a real Home Screen icon that opens the game fullscreen, with no browser
// bars. It never expires and doesn't count toward the 3-app sideload limit.

enum WebClipProfile {
    static func make(for game: Game, gameURL: URL, iconPNG: Data) throws -> Data {
        let clip: [String: Any] = [
            "PayloadType": "com.apple.webClip.managed",
            "PayloadVersion": 1,
            "PayloadIdentifier": "\(AppConfig.bundlePrefix).webclip.\(game.id)",
            "PayloadUUID": stableUUID("clip-\(game.id)"),
            "PayloadDisplayName": game.title,
            "Label": game.homeScreenLabel,
            "URL": gameURL.absoluteString,
            "Icon": iconPNG,
            "FullScreen": true,
            "IsRemovable": true,
            "IgnoreManifestScope": true,
            "Precomposed": true,
        ]
        let profile: [String: Any] = [
            "PayloadType": "Configuration",
            "PayloadVersion": 1,
            // Same identifier every time, so installing again updates the icon instead of duplicating it.
            "PayloadIdentifier": "\(AppConfig.bundlePrefix).game.\(game.id)",
            "PayloadUUID": stableUUID("profile-\(game.id)"),
            "PayloadDisplayName": "\(game.title) — \(AppConfig.companyName)",
            "PayloadDescription": "Adds \(game.title) to your Home Screen. Delete the icon or remove this profile anytime.",
            "PayloadOrganization": AppConfig.companyName,
            "PayloadRemovalDisallowed": false,
            "PayloadContent": [clip],
        ]
        return try PropertyListSerialization.data(fromPropertyList: profile, format: .xml, options: 0)
    }

    /// The same game always gets the same UUID.
    private static func stableUUID(_ seed: String) -> String {
        var b = Array(SHA256.hash(data: Data((AppConfig.bundlePrefix + seed).utf8)).prefix(16))
        b[6] = (b[6] & 0x0F) | 0x50   // version 5 style
        b[8] = (b[8] & 0x3F) | 0x80   // RFC 4122 variant
        let t: uuid_t = (b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
                         b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15])
        return UUID(uuid: t).uuidString
    }
}

/// Serves one file on 127.0.0.1 (this phone only) with the content type iOS needs for profiles.
final class ProfileServer {
    private final class Once { var done = false }

    private let body: Data
    private let path: String
    private let filename: String
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "rampace.profile-server")

    init(body: Data, path: String, filename: String) {
        self.body = body
        self.path = path
        self.filename = filename
    }

    func start() async throws -> UInt16 {
        let params = NWParameters.tcp
        params.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: .any)
        params.allowLocalEndpointReuse = true
        let l = try NWListener(using: params)
        listener = l
        l.newConnectionHandler = { [weak self] conn in self?.handle(conn) }

        return try await withCheckedThrowingContinuation { cont in
            let once = Once()
            l.stateUpdateHandler = { state in
                guard !once.done else { return }
                switch state {
                case .ready:
                    once.done = true
                    cont.resume(returning: l.port?.rawValue ?? 0)
                case .failed(let err):
                    once.done = true
                    cont.resume(throwing: err)
                case .cancelled:
                    once.done = true
                    cont.resume(throwing: CancellationError())
                default:
                    break
                }
            }
            l.start(queue: queue)
        }
    }

    func stop() {
        listener?.cancel()
        listener = nil
    }

    private func handle(_ conn: NWConnection) {
        conn.start(queue: queue)
        conn.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { [weak self] data, _, _, _ in
            guard let self else { conn.cancel(); return }
            let request = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            let firstLine = request.components(separatedBy: "\r\n").first ?? ""
            let parts = firstLine.split(separator: " ")
            let method = parts.first.map(String.init) ?? "GET"
            let requested = parts.count > 1 ? String(parts[1]) : "/"

            var response: Data
            if requested.hasPrefix(self.path) {
                let head = [
                    "HTTP/1.1 200 OK",
                    "Content-Type: application/x-apple-aspen-config",
                    "Content-Disposition: attachment; filename=\"\(self.filename)\"",
                    "Content-Length: \(self.body.count)",
                    "Cache-Control: no-store",
                    "Connection: close",
                    "", "",
                ].joined(separator: "\r\n")
                response = Data(head.utf8)
                if method != "HEAD" { response.append(self.body) }
            } else {
                response = Data("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".utf8)
            }
            conn.send(content: response, completion: .contentProcessed { _ in conn.cancel() })
        }
    }
}

@MainActor
final class HomeScreenInstaller: ObservableObject {
    @Published var preparingGameID: String?
    @Published var errorMessage: String?
    /// Set when a profile is ready; the view shows it in an in-app Safari sheet.
    @Published var safariLink: SafariLink?
    @Published private(set) var addedIDs: Set<String> =
        Set(UserDefaults.standard.stringArray(forKey: "homeScreenAdded") ?? [])

    private var server: ProfileServer?
    private var stopTask: Task<Void, Never>?
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
    private var lastURL: URL?

    func wasAdded(_ game: Game) -> Bool {
        addedIDs.contains(game.id)
    }

    /// Builds the profile, starts the local server, and opens it in the in-app Safari view.
    func prepare(_ game: Game) async {
        guard let gameURL = game.playURL, game.launch == .web else { return }
        preparingGameID = game.id
        errorMessage = nil
        defer { preparingGameID = nil }

        do {
            let icon = await iconPNG(for: game)
            let profile = try WebClipProfile.make(for: game, gameURL: gameURL, iconPNG: icon)
            stopServer()
            let file = "\(game.id).mobileconfig"
            let srv = ProfileServer(body: profile, path: "/\(file)", filename: file)
            server = srv
            let port = try await srv.start()
            guard let url = URL(string: "http://127.0.0.1:\(port)/\(file)") else { return }
            lastURL = url
            scheduleStop(after: 600)
            markAdded(game.id)
            safariLink = SafariLink(url: url)
        } catch {
            errorMessage = "Couldn't prepare the Home Screen install. Please try again."
        }
    }

    /// Backup route: open the same file in the real Safari app.
    func openInSafariApp() {
        guard let url = lastURL else { return }
        safariLink = nil
        // Keep the little server alive while Safari has the foreground.
        if backgroundTask == .invalid {
            backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "profile") { [weak self] in
                Task { @MainActor in self?.endBackgroundTask() }
            }
        }
        UIApplication.shared.open(url)
    }

    private func scheduleStop(after seconds: UInt64) {
        stopTask?.cancel()
        stopTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: seconds * 1_000_000_000)
            guard !Task.isCancelled else { return }
            self?.stopServer()
        }
    }

    private func stopServer() {
        server?.stop()
        server = nil
        endBackgroundTask()
    }

    private func endBackgroundTask() {
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
    }

    private func markAdded(_ id: String) {
        addedIDs.insert(id)
        UserDefaults.standard.set(Array(addedIDs), forKey: "homeScreenAdded")
    }

    /// 512×512 PNG: the bundled icon, else the online icon, else the generated artwork.
    private func iconPNG(for game: Game) async -> Data {
        if let ui = game.bundledIcon, let png = Self.squarePNG(ui) { return png }
        if let url = game.remoteIconURL {
            let downloaded = try? await URLSession.shared.data(from: url)
            if let data = downloaded?.0, let ui = UIImage(data: data), let png = Self.squarePNG(ui) {
                return png
            }
        }
        let renderer = ImageRenderer(content:
            GameIcon(game: game, size: 512).clipShape(Rectangle())
        )
        renderer.scale = 1
        if let ui = renderer.uiImage, let png = ui.pngData() { return png }
        return Data()
    }

    private static func squarePNG(_ image: UIImage, side: CGFloat = 512) -> Data? {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let r = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format)
        return r.image { ctx in
            UIColor.black.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: side, height: side))
            let s = image.size
            let scale = max(side / s.width, side / s.height)
            let w = s.width * scale, h = s.height * scale
            image.draw(in: CGRect(x: (side - w) / 2, y: (side - h) / 2, width: w, height: h))
        }.pngData()
    }
}

/// In-app Safari, which can hand install profiles to iOS Settings.
struct SafariView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let vc = SFSafariViewController(url: url)
        vc.preferredControlTintColor = UIColor(AppConfig.brandBlue)
        vc.dismissButtonStyle = .done
        return vc
    }
    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}

struct SafariLink: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}
