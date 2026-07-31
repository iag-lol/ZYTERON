import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        VStack(spacing: 22) {
            BrandMark(size: 74)
            VStack(spacing: 6) {
                Text("Zyteron Widget").font(.largeTitle.bold())
                Text("Conecta el panel administrativo con el escritorio de tu Mac.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            VStack(alignment: .leading, spacing: 14) {
                TextField("URL de Zyteron", text: $model.baseURLText)
                    .textFieldStyle(.roundedBorder)
                SecureField("Contraseña administrativa", text: $model.password)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit { Task { await model.signIn() } }

                Button {
                    Task { await model.signIn() }
                } label: {
                    HStack {
                        if model.isLoading { ProgressView().controlSize(.small) }
                        Text(model.isLoading ? "Conectando…" : "Iniciar sesión")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(model.isLoading || model.password.isEmpty)

                if let status = model.statusMessage {
                    Label(status, systemImage: model.sessionExpired ? "clock.badge.exclamationmark" : "exclamationmark.circle")
                        .font(.caption)
                        .foregroundStyle(model.sessionExpired ? Color.orange : Color.secondary)
                }
            }
            .padding(20)
            .frame(width: 390)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18))

            Label("La contraseña solo se envía al servidor durante el acceso. El token se guarda en Keychain.", systemImage: "lock.shield.fill")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: 390)
        }
        .padding(36)
    }
}
