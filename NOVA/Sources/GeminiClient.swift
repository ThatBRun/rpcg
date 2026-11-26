import Foundation

enum NovaError: LocalizedError {
    case noKey, badKey, speechUnavailable, permissionDenied, network(String)

    var errorDescription: String? {
        switch self {
        case .noKey: return "Add your Gemini key in Settings first."
        case .badKey: return "That Gemini key didn't work. Check it in Settings."
        case .speechUnavailable: return "Speech recognition isn't available right now."
        case .permissionDenied: return "NOVA needs the microphone and speech recognition. Turn them on in Settings > NOVA."
        case .network(let m): return m
        }
    }
}

/// Talks to Google's Gemini API. Keeps the conversation (including tool calls) between turns.
@MainActor
final class GeminiClient {
    /// Tried in order; if one is busy or retired, the next is used.
    private let models = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"]
    private var modelIndex = 0
    private var contents: [[String: Any]] = []

    func reset() { contents.removeAll() }

    func ask(_ text: String, key: String, system: String, tools: NovaTools) async throws -> String {
        contents.append(["role": "user", "parts": [["text": text]]])
        trimHistory()

        for _ in 0..<6 {
            let content = try await generate(key: key, system: system)
            contents.append(content)
            let parts = content["parts"] as? [[String: Any]] ?? []
            let calls = parts.compactMap { $0["functionCall"] as? [String: Any] }

            if calls.isEmpty {
                let reply = parts.compactMap { $0["text"] as? String }.joined(separator: " ")
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                return reply.isEmpty ? "Done." : reply
            }

            var responses: [[String: Any]] = []
            for call in calls {
                let name = call["name"] as? String ?? ""
                let args = call["args"] as? [String: Any] ?? [:]
                let result = await tools.run(name, args: args)
                responses.append(["functionResponse": ["name": name, "response": ["result": result]]])
            }
            contents.append(["role": "user", "parts": responses])
        }
        return "Sorry, I got a bit tangled up on that one."
    }

    private func generate(key: String, system: String) async throws -> [String: Any] {
        let body: [String: Any] = [
            "systemInstruction": ["parts": [["text": system]]],
            "contents": contents,
            "tools": [["functionDeclarations": NovaTools.declarations]],
            "generationConfig": ["maxOutputTokens": 600, "temperature": 0.7],
        ]
        let bodyData = try JSONSerialization.data(withJSONObject: body)
        var lastMessage = "I couldn't reach Gemini. Check your connection."

        for attempt in 0..<models.count {
            let model = models[(modelIndex + attempt) % models.count]
            guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent") else { continue }
            var req = URLRequest(url: url, timeoutInterval: 45)
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue(key, forHTTPHeaderField: "x-goog-api-key")
            req.httpBody = bodyData

            let data: Data
            let response: URLResponse
            do {
                (data, response) = try await URLSession.shared.data(for: req)
            } catch {
                lastMessage = "I couldn't reach Gemini. Check your connection."
                continue
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]

            if status == 200 {
                modelIndex = (modelIndex + attempt) % models.count
                let candidates = json["candidates"] as? [[String: Any]] ?? []
                guard var content = candidates.first?["content"] as? [String: Any],
                      let parts = content["parts"] as? [[String: Any]], !parts.isEmpty else {
                    return ["role": "model", "parts": [["text": "I'd rather not answer that one."]]]
                }
                content["role"] = "model"
                return content
            }

            let message = ((json["error"] as? [String: Any])?["message"] as? String) ?? "HTTP \(status)"
            if status == 400 && message.localizedCaseInsensitiveContains("api key") { throw NovaError.badKey }
            if status == 401 || status == 403 { throw NovaError.badKey }
            lastMessage = "Gemini said: \(message)"
            // 404 (model retired), 429 (busy / quota), 5xx: try the next model.
        }
        throw NovaError.network(lastMessage)
    }

    /// Keep the last ~12 exchanges, always starting at a normal user message.
    private func trimHistory() {
        guard contents.count > 30 else { return }
        contents.removeFirst(contents.count - 24)
        while let first = contents.first, !Self.isUserText(first) {
            contents.removeFirst()
        }
    }

    private static func isUserText(_ c: [String: Any]) -> Bool {
        guard c["role"] as? String == "user", let parts = c["parts"] as? [[String: Any]] else { return false }
        return parts.contains { $0["text"] != nil }
    }
}
