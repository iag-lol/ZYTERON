import Foundation

enum SharedConfiguration {
    static let appGroup = "group.cl.zyteron.widget"
    static let widgetKind = "ZyteronDashboardWidget"
    private static let baseURLKey = "zyteron.widget.baseURL"

    static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroup) ?? .standard
    }

    static var baseURL: URL? {
        guard let raw = defaults.string(forKey: baseURLKey) else { return nil }
        return normalizedBaseURL(raw)
    }

    static func saveBaseURL(_ raw: String) throws -> URL {
        guard let url = normalizedBaseURL(raw) else { throw APIError.invalidBaseURL }
        defaults.set(url.absoluteString, forKey: baseURLKey)
        return url
    }

    static func normalizedBaseURL(_ raw: String) -> URL? {
        var value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        while value.hasSuffix("/") { value.removeLast() }
        if !value.contains("://") { value = "https://\(value)" }
        guard let url = URL(string: value), let scheme = url.scheme?.lowercased(), url.host != nil else { return nil }
        guard scheme == "https" || (scheme == "http" && ["localhost", "127.0.0.1"].contains(url.host)) else { return nil }
        return url
    }

    static func absoluteURL(for path: String) -> URL? {
        guard let baseURL else { return nil }
        if let absolute = URL(string: path), absolute.scheme != nil { return absolute }
        return URL(string: path, relativeTo: baseURL)?.absoluteURL
    }
}
