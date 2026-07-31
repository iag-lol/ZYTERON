import Foundation

struct DashboardSnapshot: Codable, Sendable {
    let generatedAt: String
    let timeZone: String
    let partial: Bool
    let warnings: [String]
    let metrics: Metrics
    let alerts: Alerts
    let latestWhatsapp: WhatsappItem?
    let recentContacts: [ContactItem]
    let recentMessages: [MessageItem]
    let recentClients: [ClientItem]
    let links: Links

    struct Metrics: Codable, Sendable {
        let contactsNewToday: Int
        let quotesNewToday: Int
        let whatsappPending: Int
        let webMessagesToday: Int
        let partnerClientsNewToday: Int
        let executiveClientsNewToday: Int
        let potentialClients: Int
        let wonClients: Int
        let pendingAlerts: Int
    }

    struct Alerts: Codable, Sendable {
        let whatsappPending: Int
        let highPriorityUnread: Int
        let validationPending: Int
        let followUpsDue: Int
    }

    struct WhatsappItem: Codable, Identifiable, Sendable {
        let id: String
        let conversationId: String
        let name: String
        let preview: String
        let receivedAt: String
        let href: String
    }

    struct ContactItem: Codable, Identifiable, Sendable {
        let id: String
        let name: String
        let channel: String
        let preview: String
        let createdAt: String
        let href: String
    }

    struct MessageItem: Codable, Identifiable, Sendable {
        let id: String
        let name: String
        let preview: String
        let createdAt: String
        let href: String
    }

    struct ClientItem: Codable, Identifiable, Sendable {
        let id: String
        let name: String
        let ownerName: String
        let ownerRole: String
        let validationStatus: String
        let commercialStatus: String
        let createdAt: String
        let href: String
    }

    struct Links: Codable, Sendable {
        let contacts: String
        let quotes: String
        let whatsapp: String
        let partners: String
    }

    static let sample = DashboardSnapshot(
        generatedAt: ISO8601DateFormatter().string(from: Date()),
        timeZone: "America/Santiago",
        partial: false,
        warnings: [],
        metrics: Metrics(
            contactsNewToday: 4,
            quotesNewToday: 2,
            whatsappPending: 3,
            webMessagesToday: 5,
            partnerClientsNewToday: 2,
            executiveClientsNewToday: 1,
            potentialClients: 8,
            wonClients: 3,
            pendingAlerts: 6
        ),
        alerts: Alerts(whatsappPending: 3, highPriorityUnread: 1, validationPending: 2, followUpsDue: 1),
        latestWhatsapp: WhatsappItem(
            id: "sample-message",
            conversationId: "sample-conversation",
            name: "María González",
            preview: "Hola, quisiera cotizar una tienda online para mi empresa.",
            receivedAt: ISO8601DateFormatter().string(from: Date()),
            href: "/admin/whatsapp"
        ),
        recentContacts: [
            ContactItem(id: "1", name: "Andes SpA", channel: "CONTACTO_WEB", preview: "Sistema de gestión interna", createdAt: ISO8601DateFormatter().string(from: Date()), href: "/admin/contactos"),
            ContactItem(id: "2", name: "Camila Rojas", channel: "CHAT_IA", preview: "Sitio corporativo", createdAt: ISO8601DateFormatter().string(from: Date()), href: "/admin/contactos")
        ],
        recentMessages: [
            MessageItem(id: "1", name: "María González", preview: "Quisiera cotizar una tienda online", createdAt: ISO8601DateFormatter().string(from: Date()), href: "/admin/whatsapp")
        ],
        recentClients: [
            ClientItem(id: "1", name: "Patagonia Ltda.", ownerName: "Diego Soto", ownerRole: "partner", validationStatus: "potential", commercialStatus: "follow_up", createdAt: ISO8601DateFormatter().string(from: Date()), href: "/admin/comercial?tab=leads")
        ],
        links: Links(contacts: "/admin/contactos", quotes: "/admin/cotizaciones", whatsapp: "/admin/whatsapp", partners: "/admin/comercial?tab=leads")
    )
}

struct LoginResponse: Codable, Sendable {
    let ok: Bool
    let role: String
    let token: String
    let expiresAt: String
}

struct ServerErrorResponse: Codable, Sendable {
    let error: String
}

enum ZyteronDate {
    private static func fractionalFormatter() -> ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }

    static func parse(_ value: String) -> Date? {
        fractionalFormatter().date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }

    static func time(_ value: String) -> String {
        guard let date = parse(value) else { return "—" }
        return date.formatted(date: .omitted, time: .shortened)
    }

    static func relative(_ value: String) -> String {
        guard let date = parse(value) else { return "—" }
        return date.formatted(.relative(presentation: .named))
    }
}
