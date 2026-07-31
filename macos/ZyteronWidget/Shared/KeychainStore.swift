import Foundation
import Security

enum KeychainStore {
    private static let service = "cl.zyteron.widget.session"
    private static let tokenAccount = "admin-widget-token"
    private static let baseURLAccount = "server-base-url"

    private static var accessGroup: String? {
        Bundle.main.object(forInfoDictionaryKey: "SharedKeychainAccessGroup") as? String
    }

    static func saveToken(_ token: String) throws {
        try save(token, account: tokenAccount)
    }

    static func token() -> String? {
        value(account: tokenAccount)
    }

    static func saveBaseURL(_ url: URL) throws {
        try save(url.absoluteString, account: baseURLAccount)
    }

    static func baseURLString() -> String? {
        value(account: baseURLAccount)
    }

    static func deleteToken() {
        SecItemDelete(baseQuery(account: tokenAccount) as CFDictionary)
    }

    private static func save(_ value: String, account: String) throws {
        guard let data = value.data(using: .utf8) else { throw APIError.secureStorage }
        let query = baseQuery(account: account)
        SecItemDelete(query as CFDictionary)
        var insert = query
        insert[kSecValueData as String] = data
        insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        let status = SecItemAdd(insert as CFDictionary, nil)
        guard status == errSecSuccess else { throw APIError.secureStorage }
    }

    private static func value(account: String) -> String? {
        var query = baseQuery(account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func baseQuery(account: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        if let accessGroup, !accessGroup.isEmpty {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        return query
    }
}
