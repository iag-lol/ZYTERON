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
                entry = ZyteronEntry(date: Date(), snapshot: SharedStore.cachedSnapshot(), state: .needsLogin)
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
                .containerBackground(for: .widget) {
                    LinearGradient(
                        colors: [Color(nsColor: .windowBackgroundColor), Color.blue.opacity(0.08)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
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

private struct WidgetHeader: View {
    let snapshot: DashboardSnapshot
    let state: ZyteronEntry.State
    var compact = false

    var body: some View {
        HStack(spacing: 8) {
            WidgetBrandMark(size: compact ? 22 : 26)
            VStack(alignment: .leading, spacing: 0) {
                Text("ZYTERON").font(.caption2.bold()).tracking(1.2)
                if !compact { Text("Panel de actividad").font(.system(size: 9)).foregroundStyle(.secondary) }
            }
            Spacer()
            if snapshot.metrics.pendingAlerts > 0 {
                Circle().fill(.red).frame(width: 7, height: 7).accessibilityLabel("Hay elementos nuevos")
            }
            Button(intent: RefreshWidgetIntent()) {
                Image(systemName: "arrow.clockwise").font(.caption.bold())
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
            .font(.caption.weight(.semibold))

            if let message = snapshot.latestWhatsapp, let url = SharedConfiguration.absoluteURL(for: message.href) {
                Link(destination: url) {
                    HStack(spacing: 8) {
                        Circle().fill(Color.green.opacity(0.15)).frame(width: 28, height: 28).overlay(Image(systemName: "message.fill").font(.caption).foregroundStyle(.green))
                        VStack(alignment: .leading, spacing: 1) {
                            Text(message.name).font(.caption.bold()).lineLimit(1)
                            Text(message.preview).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                        }
                        Spacer()
                        Text(ZyteronDate.time(message.receivedAt)).font(.caption2).foregroundStyle(.tertiary)
                    }
                }
                .buttonStyle(.plain)
            }
            FreshnessLine(snapshot: snapshot, state: state)
        }
        .padding(14)
    }
}

private struct LargeWidget: View {
    let snapshot: DashboardSnapshot
    let state: ZyteronEntry.State

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            WidgetHeader(snapshot: snapshot, state: state)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 7), count: 4), spacing: 7) {
                MetricTile(label: "Contactos", value: snapshot.metrics.contactsNewToday, icon: "person.badge.plus", color: .blue, path: snapshot.links.contacts)
                MetricTile(label: "Cotizaciones", value: snapshot.metrics.quotesNewToday, icon: "doc.text.fill", color: .cyan, path: snapshot.links.quotes)
                MetricTile(label: "WhatsApp", value: snapshot.metrics.whatsappPending, icon: "message.fill", color: .green, path: snapshot.links.whatsapp)
                MetricTile(label: "Web", value: snapshot.metrics.webMessagesToday, icon: "bubble.left.and.text.bubble.right.fill", color: .indigo, path: snapshot.links.contacts)
                MetricTile(label: "Partners", value: snapshot.metrics.partnerClientsNewToday, icon: "person.2.fill", color: .teal, path: snapshot.links.partners)
                MetricTile(label: "Ejecutivos", value: snapshot.metrics.executiveClientsNewToday, icon: "briefcase.fill", color: .purple, path: snapshot.links.partners)
                MetricTile(label: "Potenciales", value: snapshot.metrics.potentialClients, icon: "target", color: .orange, path: snapshot.links.partners)
                MetricTile(label: "Ganados", value: snapshot.metrics.wonClients, icon: "checkmark.seal.fill", color: .green, path: snapshot.links.partners)
            }

            HStack(alignment: .top, spacing: 12) {
                WidgetList(title: "Últimos contactos", icon: "person.2.fill") {
                    ForEach(snapshot.recentContacts.prefix(3)) { contact in
                        WidgetRow(title: contact.name, subtitle: contact.channel.replacingOccurrences(of: "_", with: " "), status: nil, date: contact.createdAt, path: contact.href)
                    }
                }
                WidgetList(title: "Mensajes", icon: "message.fill") {
                    ForEach(snapshot.recentMessages.prefix(3)) { message in
                        WidgetRow(title: message.name, subtitle: message.preview, status: nil, date: message.createdAt, path: message.href)
                    }
                }
                WidgetList(title: "Nuevos clientes", icon: "briefcase.fill") {
                    ForEach(snapshot.recentClients.prefix(3)) { client in
                        WidgetRow(title: client.name, subtitle: "\(client.ownerName) · \(roleLabel(client.ownerRole))", status: statusLabel(client.commercialStatus), date: client.createdAt, path: client.href)
                    }
                }
            }
            .frame(maxHeight: .infinity, alignment: .top)

            HStack {
                Label("\(snapshot.alerts.validationPending) por revisar", systemImage: "checklist")
                Label("\(snapshot.alerts.followUpsDue) seguimientos", systemImage: "calendar.badge.exclamationmark")
                Spacer()
                FreshnessLine(snapshot: snapshot, state: state)
            }
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(.secondary)
        }
        .padding(14)
    }
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
                HStack {
                    Image(systemName: icon).foregroundStyle(color).frame(width: 18)
                    Text(label).font(.caption.weight(.semibold))
                    Spacer()
                    Text(value.formatted()).font(.title3.bold()).foregroundStyle(value > 0 ? color : .secondary)
                }
            }.buttonStyle(.plain)
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
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Image(systemName: icon).font(.caption2).foregroundStyle(color)
                        Spacer()
                        if value > 0 { Circle().fill(color).frame(width: 5, height: 5) }
                    }
                    Text(value.formatted()).font(.title3.bold())
                    Text(label).font(.system(size: 9, weight: .semibold)).foregroundStyle(.secondary).lineLimit(1)
                }
                .padding(8)
                .background(color.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
            }.buttonStyle(.plain)
        }
    }
}

private struct WidgetList<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content

    init(title: String, icon: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.icon = icon
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Label(title, systemImage: icon).font(.caption2.bold()).foregroundStyle(.secondary)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct WidgetRow: View {
    let title: String
    let subtitle: String
    let status: String?
    let date: String
    let path: String

    var body: some View {
        if let url = SharedConfiguration.absoluteURL(for: path) {
            Link(destination: url) {
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        Text(title).font(.system(size: 10, weight: .bold)).lineLimit(1)
                        Spacer()
                        Text(ZyteronDate.time(date)).font(.system(size: 8)).foregroundStyle(.tertiary)
                    }
                    Text(subtitle).font(.system(size: 9)).foregroundStyle(.secondary).lineLimit(1)
                    if let status { Text(status).font(.system(size: 8, weight: .bold)).foregroundStyle(.blue).lineLimit(1) }
                }
                .padding(.vertical, 2)
            }.buttonStyle(.plain)
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
        .foregroundStyle(.secondary)
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
            Text(title).font(.headline).multilineTextAlignment(.center)
            Text(detail).font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
            if let url = URL(string: "zyteron-widget://open") {
                Link("Abrir Zyteron Widget", destination: url).font(.caption.bold())
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

private func roleLabel(_ value: String) -> String {
    ["partner": "Partner", "executive": "Ejecutivo", "portfolio": "Cartera"][value] ?? value
}
