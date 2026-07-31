import Foundation

enum SharedStore {
    private static let cacheDirectoryName = "ZyteronWidget"
    private static let cacheFilename = "dashboard-snapshot.json"

    static func save(_ snapshot: DashboardSnapshot) throws {
        guard let containerURL else { throw APIError.sharedContainer }
        try FileManager.default.createDirectory(
            at: containerURL,
            withIntermediateDirectories: true
        )
        let url = containerURL.appendingPathComponent(cacheFilename, isDirectory: false)
        let data = try JSONEncoder().encode(snapshot)
        try data.write(to: url, options: .atomic)
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
        containerURL?.appendingPathComponent(cacheFilename, isDirectory: false)
    }

    private static var containerURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
            .first?
            .appendingPathComponent(cacheDirectoryName, isDirectory: true)
    }
}
