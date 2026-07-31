import Foundation

enum APIError: LocalizedError, Equatable {
    case invalidBaseURL
    case notConfigured
    case unauthorized
    case server(String)
    case invalidResponse
    case secureStorage
    case sharedContainer

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL: "Ingresa una URL HTTPS válida de Zyteron."
        case .notConfigured: "Configura la URL e inicia sesión desde la app Zyteron Widget."
        case .unauthorized: "La sesión venció. Inicia sesión nuevamente."
        case .server(let message): message
        case .invalidResponse: "Zyteron devolvió una respuesta no válida."
        case .secureStorage: "No fue posible guardar la sesión en Keychain."
        case .sharedContainer: "No fue posible acceder al contenedor compartido del widget."
        }
    }
}
enum APIClient {
    static func login(baseURL: URL, password: String) async throws -> LoginResponse {
        let url = baseURL.appendingPathComponent("api/admin/widget/session")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["password": password])
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        guard let result = try? JSONDecoder().decode(LoginResponse.self, from: data), result.role == "ADMIN" else {
            throw APIError.invalidResponse
        }
        return result
    }

    static func fetchSnapshot() async throws -> DashboardSnapshot {
        guard let baseURL = SharedConfiguration.baseURL,
              let token = KeychainStore.token() else { throw APIError.notConfigured }
        let url = baseURL.appendingPathComponent("api/admin/widget/dashboard")
        var request = URLRequest(url: url)
        request.timeoutInterval = 25
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response: response, data: data)
        guard let snapshot = try? JSONDecoder().decode(DashboardSnapshot.self, from: data) else {
            throw APIError.invalidResponse
        }
        return snapshot
    }

    private static func validate(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        if http.statusCode == 401 || http.statusCode == 403 { throw APIError.unauthorized }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ServerErrorResponse.self, from: data).error)
                ?? "El servidor no pudo completar la solicitud (\(http.statusCode))."
            throw APIError.server(message)
        }
    }
}
