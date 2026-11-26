import UIKit
import MediaPlayer
import UserNotifications

/// Things NOVA can actually do on the iPhone. Gemini decides when to use them.
@MainActor
struct NovaTools {
    static let declarations: [[String: Any]] = [
        [
            "name": "get_phone_status",
            "description": "Battery level, charging state, Low Power Mode, and the current date and time.",
            "parameters": ["type": "OBJECT", "properties": [String: Any]()],
        ],
        [
            "name": "open_app",
            "description": "Open an app on the iPhone by name, e.g. Spotify, YouTube, Maps, Messages, Mail, Calendar, Notes, Photos, App Store, Discord, Roblox.",
            "parameters": ["type": "OBJECT",
                           "properties": ["name": ["type": "STRING", "description": "The app's name"]],
                           "required": ["name"]],
        ],
        [
            "name": "open_website",
            "description": "Open a website or web search in Safari.",
            "parameters": ["type": "OBJECT",
                           "properties": ["url": ["type": "STRING", "description": "A web address, or words to search for"]],
                           "required": ["url"]],
        ],
        [
            "name": "set_reminder",
            "description": "Remind the user with a notification after a number of minutes.",
            "parameters": ["type": "OBJECT",
                           "properties": [
                               "minutes": ["type": "NUMBER", "description": "Minutes from now"],
                               "message": ["type": "STRING", "description": "What to remind them about"],
                           ],
                           "required": ["minutes", "message"]],
        ],
        [
            "name": "control_music",
            "description": "Control the Apple Music player: play, pause, next or previous.",
            "parameters": ["type": "OBJECT",
                           "properties": ["action": ["type": "STRING", "enum": ["play", "pause", "next", "previous"]]],
                           "required": ["action"]],
        ],
    ]

    private static let appLinks: [String: String] = [
        "music": "music://", "apple music": "music://", "spotify": "spotify://",
        "youtube": "youtube://", "youtube music": "youtubemusic://",
        "maps": "maps://", "apple maps": "maps://", "google maps": "comgooglemaps://",
        "messages": "sms:", "imessage": "sms:", "mail": "message://", "gmail": "googlegmail://",
        "calendar": "calshow://", "notes": "mobilenotes://", "photos": "photos-redirect://",
        "app store": "itms-apps://", "facetime": "facetime://", "clock": "clock-alarm://",
        "shortcuts": "shortcuts://", "files": "shareddocuments://", "safari": "x-web-search://",
        "chrome": "googlechrome://", "discord": "discord://", "instagram": "instagram://",
        "tiktok": "snssdk1233://", "snapchat": "snapchat://", "netflix": "nflx://",
        "roblox": "roblox://", "twitter": "twitter://", "x": "twitter://", "reddit": "reddit://",
        "whatsapp": "whatsapp://", "twitch": "twitch://", "espn": "sportscenter://",
        "settings": "App-prefs:",
    ]

    func run(_ name: String, args: [String: Any]) async -> String {
        switch name {
        case "get_phone_status": return phoneStatus()
        case "open_app": return await openApp(args["name"] as? String ?? "")
        case "open_website": return await openWebsite(args["url"] as? String ?? "")
        case "set_reminder":
            let minutes = (args["minutes"] as? NSNumber)?.doubleValue ?? Double("\(args["minutes"] ?? "")") ?? 0
            return await setReminder(minutes: minutes, message: args["message"] as? String ?? "Reminder")
        case "control_music": return controlMusic(args["action"] as? String ?? "")
        default: return "Unknown tool \(name)."
        }
    }

    private func phoneStatus() -> String {
        let device = UIDevice.current
        device.isBatteryMonitoringEnabled = true
        var parts: [String] = []
        if device.batteryLevel >= 0 {
            parts.append("Battery \(Int((device.batteryLevel * 100).rounded())) percent")
        }
        switch device.batteryState {
        case .charging: parts.append("charging")
        case .full: parts.append("fully charged and plugged in")
        case .unplugged: parts.append("not charging")
        default: break
        }
        if ProcessInfo.processInfo.isLowPowerModeEnabled { parts.append("Low Power Mode is on") }
        let f = DateFormatter()
        f.dateFormat = "EEEE MMMM d, h:mm a"
        parts.append("It is \(f.string(from: Date()))")
        return parts.joined(separator: ". ") + "."
    }

    private func openApp(_ raw: String) async -> String {
        var key = raw.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        for junk in ["the ", " app"] { key = key.replacingOccurrences(of: junk, with: " ") }
        key = key.trimmingCharacters(in: .whitespaces)
        let link = Self.appLinks[key]
            ?? Self.appLinks.first(where: { key.contains($0.key) && $0.key.count > 2 })?.value
        guard let link, let url = URL(string: link) else {
            return "I don't know how to open \(raw) on the iPhone. Apple only lets me open apps that support it."
        }
        let ok = await UIApplication.shared.open(url)
        return ok ? "Opened \(raw)." : "Couldn't open \(raw). It may not be installed."
    }

    private func openWebsite(_ raw: String) async -> String {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        var url: URL?
        if text.contains(".") && !text.contains(" ") {
            url = URL(string: text.hasPrefix("http") ? text : "https://\(text)")
        }
        if url == nil {
            let q = text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? text
            url = URL(string: "https://www.google.com/search?q=\(q)")
        }
        guard let url else { return "That doesn't look like a website." }
        let ok = await UIApplication.shared.open(url)
        return ok ? "Opened it in Safari." : "Couldn't open that."
    }

    private func setReminder(minutes: Double, message: String) async -> String {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
        guard granted else { return "Notifications are off for NOVA, so I can't set reminders. Turn them on in Settings." }
        let content = UNMutableNotificationContent()
        content.title = "NOVA"
        content.body = message
        content.sound = .default
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(5, minutes * 60), repeats: false)
        do {
            try await center.add(UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger))
            return "Reminder set for \(Int(minutes.rounded())) minutes from now."
        } catch {
            return "Couldn't set the reminder."
        }
    }

    private func controlMusic(_ action: String) -> String {
        let player = MPMusicPlayerController.systemMusicPlayer
        switch action {
        case "play": player.play()
        case "pause": player.pause()
        case "next": player.skipToNextItem()
        case "previous": player.skipToPreviousItem()
        default: return "Unknown music action."
        }
        return "Done. This controls Apple Music; other music apps can't be controlled by NOVA."
    }
}
