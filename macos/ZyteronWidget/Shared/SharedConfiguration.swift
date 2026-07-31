import Foundation

enum SharedConfiguration {
    static let widgetKind = "ZyteronDashboardWidget"
    private static let baseURLKey = "zyteron.widget.baseURL"
    private static let productionBaseURL = URL(string: "https://www.zyteron.cl")!

    static var defaults: UserDefaults { .standard }

    static var baseURL: URL? {
        if let shared = KeychainStore.baseURLString(), let url = normalizedBaseURL(shared) {
            return url
        }
        if let local = defaults.string(forKey: baseURLKey), let url = normalizedBaseURL(local) {
            return url
        }
        return productionBaseURL
    }

    static func saveBaseURL(_ raw: String) throws -> URL {
        guard let url = normalizedBaseURL(raw) else { throw APIError.invalidBaseURL }
        defaults.set(url.absoluteString, forKey: baseURLKey)
        try KeychainStore.saveBaseURL(url)
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
