import AppKit
import Foundation
import UserNotifications

/// Notificaciones del sistema para la actividad de Zyteron.
///
/// Cada aviso lleva el enlace de la sección correspondiente, de modo que al
/// hacer clic se abre directamente donde hay que actuar y no la portada del
/// panel. Los avisos se agrupan por tipo para que una ráfaga de mensajes no
/// llene el centro de notificaciones.
enum NotificationService {

    /// Un tipo de evento con todo lo que necesita para avisar.
    private struct Kind {
        let id: String
        let title: String
        let body: String
        let path: String
        let critical: Bool
    }

    static func requestAuthorization() async {
        let center = UNUserNotificationCenter.current()
        _ = try? await center.requestAuthorization(options: [.alert, .badge, .sound])
        registerActions()
    }

    /// Acción "Abrir en el panel" que aparece al desplegar el aviso.
    private static func registerActions() {
        let open = UNNotificationAction(
            identifier: "ZYTERON_OPEN",
            title: "Abrir en el panel",
            options: [.foreground]
        )
        let category = UNNotificationCategory(
            identifier: "ZYTERON_ACTIVITY",
            actions: [open],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    static func notifyChanges(from previous: DashboardSnapshot?, to current: DashboardSnapshot) async {
        await updateBadge(current)

        // Sin punto de comparación no se avisa: evita una avalancha al abrir.
        guard let previous else { return }

        let links = current.links
        let kinds: [(Kind, Int)] = [
            (Kind(id: "whatsapp",
                  title: "Nuevo mensaje de WhatsApp",
                  body: current.latestWhatsapp.map { "\($0.name): \($0.preview)" }
                      ?? "Hay mensajes pendientes por responder.",
                  path: links.whatsapp,
                  critical: true),
             current.metrics.whatsappPending - previous.metrics.whatsappPending),

            (Kind(id: "contact",
                  title: "Nuevo contacto",
                  body: current.recentContacts.first.map { "\($0.name) · \($0.preview)" }
                      ?? "Ingresó un contacto nuevo desde la web.",
                  path: links.contacts,
                  critical: false),
             current.metrics.contactsNewToday - previous.metrics.contactsNewToday),

            (Kind(id: "quote",
                  title: "Nueva cotización",
                  body: "Ingresó una solicitud de cotización.",
                  path: links.quotes,
                  critical: false),
             current.metrics.quotesNewToday - previous.metrics.quotesNewToday),

            (Kind(id: "web",
                  title: "Nuevo mensaje desde la web",
                  body: "Llegó una consulta desde el formulario o el asistente.",
                  path: links.contacts,
                  critical: false),
             current.metrics.webMessagesToday - previous.metrics.webMessagesToday),

            (Kind(id: "partner",
                  title: "Nuevo cliente de partner",
                  body: current.recentClients.first.map { "\($0.name) · registrado por \($0.ownerName)" }
                      ?? "Un partner registró un cliente.",
                  path: links.partners,
                  critical: false),
             current.metrics.partnerClientsNewToday - previous.metrics.partnerClientsNewToday),

            (Kind(id: "executive",
                  title: "Nuevo cliente de ejecutivo",
                  body: current.recentClients.first.map { "\($0.name) · registrado por \($0.ownerName)" }
                      ?? "Un ejecutivo registró un cliente.",
                  path: links.partners,
                  critical: false),
             current.metrics.executiveClientsNewToday - previous.metrics.executiveClientsNewToday),
        ]

        for (kind, delta) in kinds where delta > 0 {
            await send(kind, delta: delta)
        }
    }

    private static func send(_ kind: Kind, delta: Int) async {
        let content = UNMutableNotificationContent()
        content.title = delta > 1 ? "\(kind.title) (\(delta))" : kind.title
        content.body = kind.body
        content.sound = .default
        content.categoryIdentifier = "ZYTERON_ACTIVITY"
        // Agrupa por tipo en el centro de notificaciones.
        content.threadIdentifier = "zyteron.\(kind.id)"
        content.userInfo = ["path": kind.path]
        // WhatsApp interrumpe aunque haya foco; el resto espera su turno.
        content.interruptionLevel = kind.critical ? .timeSensitive : .active

        let request = UNNotificationRequest(
            identifier: "zyteron.\(kind.id).\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )
        try? await UNUserNotificationCenter.current().add(request)
    }

    /// Insignia del Dock con el total de pendientes: se ve sin abrir nada.
    @MainActor
    private static func updateBadge(_ snapshot: DashboardSnapshot) {
        let pending = snapshot.alerts.whatsappPending
            + snapshot.alerts.highPriorityUnread
            + snapshot.alerts.validationPending
            + snapshot.alerts.followUpsDue
        NSApp.dockTile.badgeLabel = pending > 0 ? "\(pending)" : nil
    }
}

/// Enruta el clic en una notificación a la sección que corresponde.
final class NotificationRouter: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationRouter()

    func register() {
        UNUserNotificationCenter.current().delegate = self
    }

    /// Muestra el aviso aunque la aplicación esté en primer plano.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let path = response.notification.request.content.userInfo["path"] as? String ?? "/admin"
        guard let url = SharedConfiguration.absoluteURL(for: path) else { return }
        await MainActor.run {
            NSWorkspace.shared.open(url)
            NSApp.dockTile.badgeLabel = nil
        }
    }
}
