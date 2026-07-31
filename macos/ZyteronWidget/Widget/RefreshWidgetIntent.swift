import AppIntents
import WidgetKit

struct RefreshWidgetIntent: AppIntent {
    static let title: LocalizedStringResource = "Actualizar Zyteron"
    static let description = IntentDescription("Actualiza los indicadores del panel Zyteron.")

    func perform() async throws -> some IntentResult {
        let snapshot = try await APIClient.fetchSnapshot()
        try SharedStore.save(snapshot)
        WidgetCenter.shared.reloadTimelines(ofKind: SharedConfiguration.widgetKind)
        return .result()
    }
}
