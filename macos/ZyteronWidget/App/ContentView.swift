import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(nsColor: .windowBackgroundColor), Color.blue.opacity(0.06)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            if model.isAuthenticated {
                dashboard
            } else {
                LoginView()
            }
        }
        .toolbar {
            if model.isAuthenticated {
                ToolbarItemGroup {
                    Button { Task { await model.refresh() } } label: {
                        Label("Actualizar", systemImage: "arrow.clockwise")
                    }
                    .disabled(model.isLoading)
                    SettingsLink { Label("Configuración", systemImage: "gearshape") }
                }
            }
        }
    }

    private var dashboard: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack(spacing: 14) {
                    BrandMark(size: 48)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Zyteron")
                            .font(.title.bold())
                        Text("Panel del escritorio")
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    if model.isLoading { ProgressView().controlSize(.small) }
                }

                if let status = model.statusMessage {
                    Label(status, systemImage: "info.circle.fill")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                }

                if let snapshot = model.snapshot {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
                        MetricCard(title: "Contactos hoy", value: snapshot.metrics.contactsNewToday, icon: "person.crop.circle.badge.plus", color: .blue) { model.open(snapshot.links.contacts) }
                        MetricCard(title: "Cotizaciones", value: snapshot.metrics.quotesNewToday, icon: "doc.text.fill", color: .cyan) { model.open(snapshot.links.quotes) }
                        MetricCard(title: "WhatsApp", value: snapshot.metrics.whatsappPending, icon: "message.fill", color: .green) { model.open(snapshot.links.whatsapp) }
                        MetricCard(title: "Alertas", value: snapshot.metrics.pendingAlerts, icon: "bell.badge.fill", color: .orange) { model.open(snapshot.links.partners) }
                    }

                    HStack(alignment: .top, spacing: 12) {
                        detailPanel(title: "Últimos contactos", icon: "person.2.fill") {
                            ForEach(snapshot.recentContacts.prefix(4)) { contact in
                                RowButton(title: contact.name, subtitle: contact.preview, date: contact.createdAt) { model.open(contact.href) }
                            }
                        }
                        detailPanel(title: "Registro comercial", icon: "briefcase.fill") {
                            ForEach(snapshot.recentClients.prefix(4)) { client in
                                RowButton(title: client.name, subtitle: "\(client.ownerName) · \(statusLabel(client.commercialStatus))", date: client.createdAt) { model.open(client.href) }
                            }
                        }
                    }

                    Text("Última actualización: \(ZyteronDate.relative(snapshot.generatedAt))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    ContentUnavailableView("Sin datos guardados", systemImage: "icloud.slash", description: Text("Pulsa Actualizar para cargar el panel."))
                }
            }
            .padding(28)
        }
    }

    private func detailPanel<Content: View>(title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon).font(.headline)
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}
private struct MetricCard: View {
    let title: String
    let value: Int
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: icon).foregroundStyle(color)
                Text(value.formatted()).font(.system(size: 28, weight: .bold, design: .rounded))
                Text(title).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(15)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }
}

private struct RowButton: View {
    let title: String
    let subtitle: String
    let date: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.callout.weight(.semibold)).lineLimit(1)
                    Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer()
                Text(ZyteronDate.time(date)).font(.caption2).foregroundStyle(.tertiary)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

private func statusLabel(_ value: String) -> String {
    [
        "registered": "Registrado", "contacted": "Contactado", "follow_up": "Seguimiento",
        "meeting_scheduled": "Reunión", "proposal_sent": "Propuesta", "negotiation": "Negociación",
        "won": "Ganado", "lost": "Perdido", "no_response": "Sin respuesta",
    ][value] ?? value
}
