import SwiftUI

@main
struct ZyteronWidgetApp: App {
    @StateObject private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .frame(minWidth: 680, minHeight: 520)
                .task { await model.start() }
        }
        .windowStyle(.hiddenTitleBar)

        Settings {
            SettingsView()
                .environmentObject(model)
                .frame(width: 520)
                .padding(24)
        }
    }
}
