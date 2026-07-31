import Foundation

enum SharedStore {
    private static let cacheFilename = "dashboard-snapshot.json"

    static func save(_ snapshot: DashboardSnapshot) throws {
        guard let url = cacheURL else { throw APIError.sharedContainer }
        let data = try JSONEncoder().encode(snapshot)
        try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
    }

    static func cachedSnapshot() -> DashboardSnapshot? {
        guard let url = cacheURL,
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(DashboardSnapshot.self, from: data)
    }

    static func clear() {
        if let cacheURL { try? FileManager.default.removeItem(at: cacheURL) }
    }

    private static var cacheURL: URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: SharedConfiguration.appGroup)?
            .appendingPathComponent(cacheFilename, isDirectory: false)
    }
}
