import SwiftUI
@preconcurrency import WidgetKit

struct ZyteronEntry: TimelineEntry {
    enum State {
        case ready
        case cached(String)
        case needsLogin
        case sessionExpired
        case empty
    }

    let date: Date
    let snapshot: DashboardSnapshot?
    let state: State
}

struct ZyteronProvider: TimelineProvider {
    func placeholder(in context: Context) -> ZyteronEntry {
        ZyteronEntry(date: Date(), snapshot: .sample, state: .ready)
    }

    func getSnapshot(in context: Context, completion: @escaping (ZyteronEntry) -> Void) {
        completion(ZyteronEntry(date: Date(), snapshot: SharedStore.cachedSnapshot() ?? .sample, state: .ready))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ZyteronEntry>) -> Void) {
        let completion = SendableCompletion(completion)
        Task {
            let entry: ZyteronEntry
            do {
                let snapshot = try await APIClient.fetchSnapshot()
                try SharedStore.save(snapshot)
                entry = ZyteronEntry(date: Date(), snapshot: snapshot, state: .ready)
            } catch APIError.unauthorized {
                entry = ZyteronEntry(date: Date(), snapshot: SharedStore.cachedSnapshot(), state: .sessionExpired)
            } catch APIError.notConfigured {
                entry = ZyteronEntry(date: Date(), snapshot: nil, state: .needsLogin)
            } catch {
                if let cached = SharedStore.cachedSnapshot() {
                    entry = ZyteronEntry(date: Date(), snapshot: cached, state: .cached(error.localizedDescription))
                } else {
                    entry = ZyteronEntry(date: Date(), snapshot: nil, state: .empty)
                }
            }
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
            completion.call(Timeline(entries: [entry], policy: .after(next)))
        }
    }
}

private final class SendableCompletion<Value>: @unchecked Sendable {
    private let closure: (Value) -> Void
    init(_ closure: @escaping (Value) -> Void) { self.closure = closure }
    func call(_ value: Value) { closure(value) }
}

struct ZyteronDashboardWidget: Widget {
    let kind = SharedConfiguration.widgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ZyteronProvider()) { entry in
            ZyteronWidgetView(entry: entry)
                .containerBackground(for: .widget) { ZyteronBackground() }
        }
        .configurationDisplayName("Panel Zyteron")
        .description("Contactos, WhatsApp, cotizaciones y actividad comercial en tu escritorio.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

private struct ZyteronWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ZyteronEntry

    var body: some View {
        Group {
            if let snapshot = entry.snapshot {
                switch family {
                case .systemSmall: SmallWidget(snapshot: snapshot, state: entry.state)
                case .systemMedium: MediumWidget(snapshot: snapshot, state: entry.state)
                default: LargeWidget(snapshot: snapshot, state: entry.state)
                }
            } else {
                WidgetEmptyState(state: entry.state)
            }
        }
        .fontDesign(.rounded)
    }
}

/// Fondo corporativo: azul profundo con un halo suave, para que el widget se
/// lea como una herramienta de trabajo y no como una tarjeta decorativa.
private struct ZyteronBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.04, green: 0.07, blue: 0.15), Color(red: 0.03, green: 0.12, blue: 0.32)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            RadialGradient(
                colors: [Color(red: 0.10, green: 0.42, blue: 1.0).opacity(0.32), .clear],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 260
            )
        }
    }
}

private enum Ink {
    static let primary = Color.white
    static let secondary = Color.white.opacity(0.62)
    static let faint = Color.white.opacity(0.38)
    static let surface = Color.white.opacity(0.07)
    static let stroke = Color.white.opacity(0.10)
}

private struct WidgetHeader: View {
    let snapshot: DashboardSnapshot
    let state: ZyteronEntry.State
    var compact = false

    /// Todo lo que espera una acción del equipo, en un solo número.
    private var pending: Int {
        snapshot.alerts.whatsappPending + snapshot.alerts.highPriorityUnread
            + snapshot.alerts.validationPending + snapshot.alerts.followUpsDue
    }

    var body: some View {
        HStack(spacing: 9) {
            WidgetBrandMark(size: compact ? 22 : 26)

            VStack(alignment: .leading, spacing: 1) {
                Text("ZYTERON")
                    .font(.system(size: compact ? 10 : 11, weight: .heavy))
                    .tracking(1.6)
                    .foregroundStyle(Ink.primary)
                if !compact {
                    Text("Actividad en vivo")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(Ink.faint)
                }
            }

            Spacer(minLength: 4)

            // Un solo contador de pendientes: qué exige atención ahora.
            if pending > 0 {
                HStack(spacing: 4) {
                    Circle().fill(Color(red: 1, green: 0.42, blue: 0.35)).frame(width: 6, height: 6)
                    Text("\(pending)")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundStyle(Ink.primary)
                }
                .padding(.horizontal, 7)
                .padding(.vertical, 3)
                .background(Color(red: 1, green: 0.42, blue: 0.35).opacity(0.16), in: Capsule())
                .accessibilityLabel("\(pending) elementos requieren atención")
            }

            Button(intent: RefreshWidgetIntent()) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Ink.secondary)
                    .frame(width: 20, height: 20)
                    .background(Ink.surface, in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Actualizar")
        }
    }
}

private struct SmallWidget: View {
    let snapshot: DashboardSnapshot
    let state: ZyteronEntry.State

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(snapshot: snapshot, state: state, compact: true)
            MetricLink(label: "Contactos", value: snapshot.metrics.contactsNewToday, icon: "person.badge.plus", color: .blue, path: snapshot.links.contacts)
            MetricLink(label: "WhatsApp", value: snapshot.metrics.whatsappPending, icon: "message.fill", color: .green, path: snapshot.links.whatsapp)
            MetricLink(label: "Partners", value: snapshot.metrics.partnerClientsNewToday, icon: "person.2.fill", color: .cyan, path: snapshot.links.partners)
            Spacer(minLength: 0)
            FreshnessLine(snapshot: snapshot, state: state)
        }
        .padding(14)
    }
}

private struct MediumWidget: View {
    let snapshot: DashboardSnapshot
    let state: ZyteronEntry.State

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            WidgetHeader(snapshot: snapshot, state: state)
            HStack(spacing: 8) {
                MetricTile(label: "Contactos", value: snapshot.metrics.contactsNewToday, icon: "person.badge.plus", color: .blue, path: snapshot.links.contacts)
                MetricTile(label: "Cotizaciones", value: snapshot.metrics.quotesNewToday, icon: "doc.text.fill", color: .cyan, path: snapshot.links.quotes)
                MetricTile(label: "WhatsApp", value: snapshot.metrics.whatsappPending, icon: "message.fill", color: .green, path: snapshot.links.whatsapp)
            }
            HStack(spacing: 10) {
                Label("Partners \(snapshot.metrics.partnerClientsNewToday)", systemImage: "person.2.fill")
                Label("Ejecutivos \(snapshot.metrics.executiveClientsNewToday)", systemImage: "briefcase.fill")
                Spacer()
                Label("\(snapshot.metrics.pendingAlerts)", systemImage: "bell.badge.fill")
                    .foregroundStyle(snapshot.metrics.pendingAlerts > 0 ? .orange : .secondary)
            }
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(Ink.secondary)

            if let message = snapshot.latestWhatsapp, let url = SharedConfiguration.absoluteURL(for: message.href) {
                Link(destination: url) {
                    HStack(spacing: 8) {
                        Circle().fill(Color.green.opacity(0.15)).frame(width: 28, height: 28).overlay(Image(systemName: "message.fill").font(.caption).foregroundStyle(.green))
                        VStack(alignment: .leading, spacing: 1) {
                            Text(message.name).font(.system(size: 11, weight: .bold)).foregroundStyle(Ink.primary).lineLimit(1)
                            Text(message.preview).font(.system(size: 9.5)).foregroundStyle(Ink.faint).lineLimit(1)
                        }
                        Spacer()
                        Text(ZyteronDate.time(message.receivedAt)).font(.system(size: 9)).foregroundStyle(Ink.faint)
                    }
                }
                .buttonStyle(.plain)
            }
            FreshnessLine(snapshot: snapshot, state: state)
        }
        .padding(14)
    }
}

/// Una línea del feed, ya normalizada sin importar de dónde venga.
private struct FeedItem: Identifiable {
    let id: String
    let icon: String
    let color: Color
    let title: String
    let detail: String
    let date: String
    let path: String
}

private struct LargeWidget: View {
    let snapshot: DashboardSnapshot
    let state: ZyteronEntry.State

    /// Un solo flujo cronológico en vez de tres columnas que quedaban vacías.
    /// Mezcla WhatsApp, contactos y registros comerciales, y muestra lo más
    /// reciente primero.
    private var feed: [FeedItem] {
        var items: [FeedItem] = []

        items += snapshot.recentMessages.prefix(4).map {
            FeedItem(id: "m-\($0.id)", icon: "message.fill", color: Color(red: 0.20, green: 0.83, blue: 0.53),
                     title: $0.name, detail: $0.preview, date: $0.createdAt, path: $0.href)
        }
        items += snapshot.recentContacts.prefix(4).map {
            FeedItem(id: "c-\($0.id)", icon: "person.badge.plus", color: Color(red: 0.35, green: 0.62, blue: 1.0),
                     title: $0.name, detail: $0.preview.isEmpty ? channelLabel($0.channel) : $0.preview,
                     date: $0.createdAt, path: $0.href)
        }
        items += snapshot.recentClients.prefix(4).map {
            FeedItem(id: "k-\($0.id)", icon: "briefcase.fill", color: Color(red: 0.72, green: 0.55, blue: 1.0),
                     title: $0.name, detail: "\($0.ownerName) · \(statusLabel($0.commercialStatus))",
                     date: $0.createdAt, path: $0.href)
        }

        return items
            .sorted { (ZyteronDate.parse($0.date) ?? .distantPast) > (ZyteronDate.parse($1.date) ?? .distantPast) }
            .prefix(5)
            .map { $0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(snapshot: snapshot, state: state)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4), spacing: 6) {
                MetricTile(label: "Contactos", value: snapshot.metrics.contactsNewToday, icon: "person.badge.plus", color: Color(red: 0.35, green: 0.62, blue: 1.0), path: snapshot.links.contacts)
                MetricTile(label: "Cotizaciones", value: snapshot.metrics.quotesNewToday, icon: "doc.text.fill", color: Color(red: 0.35, green: 0.80, blue: 0.95), path: snapshot.links.quotes)
                MetricTile(label: "WhatsApp", value: snapshot.metrics.whatsappPending, icon: "message.fill", color: Color(red: 0.20, green: 0.83, blue: 0.53), path: snapshot.links.whatsapp)
                MetricTile(label: "Web", value: snapshot.metrics.webMessagesToday, icon: "bubble.left.and.text.bubble.right.fill", color: Color(red: 0.55, green: 0.60, blue: 1.0), path: snapshot.links.contacts)
                MetricTile(label: "Partners", value: snapshot.metrics.partnerClientsNewToday, icon: "person.2.fill", color: Color(red: 0.30, green: 0.82, blue: 0.80), path: snapshot.links.partners)
                MetricTile(label: "Ejecutivos", value: snapshot.metrics.executiveClientsNewToday, icon: "briefcase.fill", color: Color(red: 0.72, green: 0.55, blue: 1.0), path: snapshot.links.partners)
                MetricTile(label: "Potenciales", value: snapshot.metrics.potentialClients, icon: "target", color: Color(red: 1.0, green: 0.70, blue: 0.30), path: snapshot.links.partners)
                MetricTile(label: "Ganados", value: snapshot.metrics.wonClients, icon: "checkmark.seal.fill", color: Color(red: 0.20, green: 0.83, blue: 0.53), path: snapshot.links.partners)
            }

            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 5) {
                    Text("ACTIVIDAD RECIENTE")
                        .font(.system(size: 8.5, weight: .heavy))
                        .tracking(1.1)
                        .foregroundStyle(Ink.faint)
                    Spacer()
                    PendingChips(alerts: snapshot.alerts)
                }

                if feed.isEmpty {
                    // Sin movimiento: se dice con claridad en vez de dejar huecos.
                    HStack(spacing: 7) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(Color(red: 0.20, green: 0.83, blue: 0.53))
                        Text("Sin actividad nueva. Todo al día.")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Ink.secondary)
                        Spacer()
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 11)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Ink.surface, in: RoundedRectangle(cornerRadius: 10))
                } else {
                    VStack(spacing: 3) {
                        ForEach(feed) { item in FeedRow(item: item) }
                    }
                }
            }

            Spacer(minLength: 0)
            FreshnessLine(snapshot: snapshot, state: state)
        }
        .padding(14)
    }
}

/// Pendientes por tipo, solo los que tienen algo que mostrar.
private struct PendingChips: View {
    let alerts: DashboardSnapshot.Alerts

    var body: some View {
        HStack(spacing: 5) {
            if alerts.validationPending > 0 {
                chip("checklist", alerts.validationPending, Color(red: 1.0, green: 0.70, blue: 0.30))
            }
            if alerts.followUpsDue > 0 {
                chip("calendar.badge.exclamationmark", alerts.followUpsDue, Color(red: 1, green: 0.42, blue: 0.35))
            }
            if alerts.highPriorityUnread > 0 {
                chip("exclamationmark.triangle.fill", alerts.highPriorityUnread, Color(red: 1, green: 0.42, blue: 0.35))
            }
        }
    }

    private func chip(_ icon: String, _ value: Int, _ color: Color) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon).font(.system(size: 8, weight: .bold))
            Text("\(value)").font(.system(size: 9, weight: .heavy))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 2.5)
        .background(color.opacity(0.15), in: Capsule())
    }
}

private struct FeedRow: View {
    let item: FeedItem

    var body: some View {
        if let url = SharedConfiguration.absoluteURL(for: item.path) {
            Link(destination: url) {
                HStack(spacing: 8) {
                    Image(systemName: item.icon)
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(item.color)
                        .frame(width: 20, height: 20)
                        .background(item.color.opacity(0.16), in: RoundedRectangle(cornerRadius: 6))

                    VStack(alignment: .leading, spacing: 0) {
                        Text(item.title)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Ink.primary)
                            .lineLimit(1)
                        Text(item.detail)
                            .font(.system(size: 9.5))
                            .foregroundStyle(Ink.faint)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 4)

                    Text(ZyteronDate.time(item.date))
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(Ink.faint)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Ink.surface.opacity(0.7), in: RoundedRectangle(cornerRadius: 9))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }
}

private func channelLabel(_ value: String) -> String {
    [
        "CONTACTO_WEB": "Formulario web",
        "COTIZADOR_WEB": "Cotizador",
        "CHAT_IA": "Asistente IA",
        "PACKAGE_BUILDER": "Planes",
    ][value] ?? value.replacingOccurrences(of: "_", with: " ").capitalized
}

private struct MetricLink: View {
    let label: String
    let value: Int
    let icon: String
    let color: Color
    let path: String

    var body: some View {
        if let url = SharedConfiguration.absoluteURL(for: path) {
            Link(destination: url) {
                HStack(spacing: 8) {
                    Image(systemName: icon)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(value > 0 ? color : Ink.faint)
                        .frame(width: 16)
                    Text(label)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Ink.secondary)
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Text(value.formatted())
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(value > 0 ? Ink.primary : Ink.faint)
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 6)
                .background(Ink.surface, in: RoundedRectangle(cornerRadius: 9))
            }
            .buttonStyle(.plain)
        }
    }
}

private struct MetricTile: View {
    let label: String
    let value: Int
    let icon: String
    let color: Color
    let path: String

    var body: some View {
        if let url = SharedConfiguration.absoluteURL(for: path) {
            Link(destination: url) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 0) {
                        Image(systemName: icon)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(value > 0 ? color : Ink.faint)
                        Spacer(minLength: 0)
                    }
                    Text(value.formatted())
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundStyle(value > 0 ? Ink.primary : Ink.secondary)
                        .contentTransition(.numericText())
                    // Una sola línea, encogiendo antes que cortar la palabra.
                    Text(label)
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Ink.faint)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Ink.surface, in: RoundedRectangle(cornerRadius: 11))
                .overlay(
                    RoundedRectangle(cornerRadius: 11)
                        .strokeBorder(value > 0 ? color.opacity(0.45) : Ink.stroke, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
        }
    }
}

private struct FreshnessLine: View {
    let snapshot: DashboardSnapshot
    let state: ZyteronEntry.State

    private var stale: Bool {
        guard let generated = ZyteronDate.parse(snapshot.generatedAt) else { return true }
        return Date().timeIntervalSince(generated) > 45 * 60
    }

    var body: some View {
        HStack(spacing: 4) {
            Circle().fill(stale || snapshot.partial || isCached ? Color.orange : Color.green).frame(width: 5, height: 5)
            Text(stale || isCached ? "Datos guardados · \(ZyteronDate.relative(snapshot.generatedAt))" : "Actualizado \(ZyteronDate.relative(snapshot.generatedAt))")
                .lineLimit(1)
        }
        .font(.system(size: 8, weight: .medium))
        .foregroundStyle(Ink.faint)
    }

    private var isCached: Bool {
        if case .cached = state { return true }
        if case .sessionExpired = state { return true }
        return false
    }
}

private struct WidgetEmptyState: View {
    let state: ZyteronEntry.State

    var body: some View {
        VStack(spacing: 10) {
            WidgetBrandMark(size: 42)
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Ink.primary)
                .multilineTextAlignment(.center)
            Text(detail)
                .font(.system(size: 10))
                .foregroundStyle(Ink.faint)
                .multilineTextAlignment(.center)
            if let url = URL(string: "zyteron-widget://open") {
                Link("Abrir Zyteron Widget", destination: url)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color(red: 0.45, green: 0.70, blue: 1.0))
            }
        }
        .padding(18)
    }

    private var title: String {
        if case .sessionExpired = state { return "Sesión vencida" }
        return "Conecta Zyteron"
    }

    private var detail: String {
        if case .sessionExpired = state { return "Abre la app e inicia sesión nuevamente." }
        return "Abre la app para configurar el servidor y la sesión administrativa."
    }
}

private struct WidgetBrandMark: View {
    let size: CGFloat
    var body: some View {
        ZStack {
            Ellipse()
                .stroke(LinearGradient(colors: [.teal, .blue], startPoint: .leading, endPoint: .trailing), lineWidth: size * 0.07)
                .frame(width: size, height: size * 0.54)
                .rotationEffect(.degrees(-26))
            Text("Z").font(.system(size: size * 0.56, weight: .black, design: .rounded)).foregroundStyle(.blue)
        }
        .frame(width: size, height: size)
    }
}

private func statusLabel(_ value: String) -> String {
    ["registered": "Registrado", "contacted": "Contactado", "follow_up": "Seguimiento", "meeting_scheduled": "Reunión", "proposal_sent": "Propuesta", "negotiation": "Negociación", "won": "Ganado", "lost": "Perdido", "no_response": "Sin respuesta"][value] ?? value
}

