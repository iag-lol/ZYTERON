import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        Form {
            Section("Servidor") {
                TextField("URL", text: $model.baseURLText)
                Text("Solo se aceptan URLs HTTPS; localhost puede usar HTTP para desarrollo.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button("Guardar URL") {
                    do {
                        _ = try SharedConfiguration.saveBaseURL(model.baseURLText)
                        model.statusMessage = "URL guardada."
                    } catch {
                        model.statusMessage = error.localizedDescription
                    }
                }
            }

            Section("Sesión") {
                if model.isAuthenticated {
                    Label("Administrador conectado", systemImage: "checkmark.shield.fill")
                        .foregroundStyle(.green)
                    Button("Cerrar sesión y borrar caché", role: .destructive) { model.logout() }
                } else {
                    Text("Inicia sesión desde la ventana principal.")
                        .foregroundStyle(.secondary)
                }
            }

            Section("Actualización") {
                Text("El widget solicita datos aproximadamente cada 15 minutos; macOS decide el momento exacto según energía y uso. La app abierta revisa cada 5 minutos y puede emitir avisos locales.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
    }
}
