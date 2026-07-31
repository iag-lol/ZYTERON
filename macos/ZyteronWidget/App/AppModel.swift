import AppKit
import Combine
import Foundation
import WidgetKit

@MainActor
final class AppModel: ObservableObject {
    @Published var baseURLText = SharedConfiguration.baseURL?.absoluteString ?? "https://zyteron.cl"
    @Published var password = ""
    @Published var snapshot = SharedStore.cachedSnapshot()
    @Published var isLoading = false
    @Published var isAuthenticated = KeychainStore.token() != nil
    @Published var statusMessage: String?
    @Published var sessionExpired = false

    private var refreshTask: Task<Void, Never>?

    func start() async {
        await NotificationService.requestAuthorization()
        if isAuthenticated { await refresh(showProgress: false) }
        scheduleForegroundRefresh()
    }

    func signIn() async {
        isLoading = true
        statusMessage = nil
        defer { isLoading = false }
        do {
            let baseURL = try SharedConfiguration.saveBaseURL(baseURLText)
            let session = try await APIClient.login(baseURL: baseURL, password: password)
            try KeychainStore.saveToken(session.token)
            password = ""
            isAuthenticated = true
            sessionExpired = false
            statusMessage = "Sesión administrativa conectada de forma segura."
            await refresh(showProgress: false)
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    func refresh(showProgress: Bool = true) async {
        if showProgress { isLoading = true }
        defer { if showProgress { isLoading = false } }
        do {
            let fresh = try await APIClient.fetchSnapshot()
            let previous = snapshot
            try SharedStore.save(fresh)
            snapshot = fresh
            sessionExpired = false
            statusMessage = fresh.partial ? "Actualización parcial: una fuente no respondió." : nil
            await NotificationService.notifyChanges(from: previous, to: fresh)
            WidgetCenter.shared.reloadAllTimelines()
        } catch APIError.unauthorized {
            KeychainStore.deleteToken()
            isAuthenticated = false
            sessionExpired = true
            statusMessage = APIError.unauthorized.localizedDescription
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            statusMessage = "Sin conexión: se conserva la última información disponible. \(error.localizedDescription)"
        }
    }

    func logout() {
        KeychainStore.deleteToken()
        SharedStore.clear()
        snapshot = nil
        isAuthenticated = false
        sessionExpired = false
        statusMessage = "Sesión cerrada y caché local eliminada."
        WidgetCenter.shared.reloadAllTimelines()
    }

    func open(_ path: String) {
        guard let url = SharedConfiguration.absoluteURL(for: path) else { return }
        NSWorkspace.shared.open(url)
    }

    private func scheduleForegroundRefresh() {
        refreshTask?.cancel()
        refreshTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(300))
                guard let self, self.isAuthenticated else { continue }
                await self.refresh(showProgress: false)
            }
        }
    }
}
