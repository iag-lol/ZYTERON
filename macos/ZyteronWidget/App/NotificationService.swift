import Foundation
import UserNotifications

enum NotificationService {
    static func requestAuthorization() async {
        _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
    }

    static func notifyChanges(from previous: DashboardSnapshot?, to current: DashboardSnapshot) async {
        guard let previous else { return }
        let changes: [(String, Int, String, String)] = [
            ("contact", current.metrics.contactsNewToday - previous.metrics.contactsNewToday, "Nuevo contacto", "Hay nuevos contactos en Zyteron."),
            ("quote", current.metrics.quotesNewToday - previous.metrics.quotesNewToday, "Nueva cotización", "Ingresó una nueva cotización."),
            ("whatsapp", current.metrics.whatsappPending - previous.metrics.whatsappPending, "Nuevo mensaje de WhatsApp", current.latestWhatsapp?.preview ?? "Hay mensajes pendientes."),
            ("web", current.metrics.webMessagesToday - previous.metrics.webMessagesToday, "Nuevo mensaje desde la web", "Llegó una consulta desde el formulario o chat."),
            ("partner", current.metrics.partnerClientsNewToday - previous.metrics.partnerClientsNewToday, "Nuevo cliente de partner", "Un partner registró un nuevo cliente."),
            ("executive", current.metrics.executiveClientsNewToday - previous.metrics.executiveClientsNewToday, "Nuevo cliente de ejecutivo", "Un ejecutivo registró un nuevo cliente."),
        ]

        for (kind, delta, title, body) in changes where delta > 0 {
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = delta > 1 ? "\(body) +\(delta) elementos nuevos." : body
            content.sound = .default
            content.categoryIdentifier = "ZYTERON_\(kind.uppercased())"
            let request = UNNotificationRequest(
                identifier: "zyteron.\(kind).\(current.generatedAt)",
                content: content,
                trigger: nil
            )
            try? await UNUserNotificationCenter.current().add(request)
        }
    }
}
