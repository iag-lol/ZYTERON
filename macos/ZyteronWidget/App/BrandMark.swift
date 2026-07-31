import SwiftUI

struct BrandMark: View {
    var size: CGFloat = 44

    var body: some View {
        ZStack {
            Ellipse()
                .stroke(
                    LinearGradient(colors: [Color(red: 0.18, green: 0.83, blue: 0.75), Color(red: 0.15, green: 0.39, blue: 0.92)], startPoint: .leading, endPoint: .trailing),
                    lineWidth: size * 0.06
                )
                .frame(width: size, height: size * 0.54)
                .rotationEffect(.degrees(-26))
            Text("Z")
                .font(.system(size: size * 0.56, weight: .black, design: .rounded))
                .foregroundStyle(
                    LinearGradient(colors: [.blue, Color(red: 0.04, green: 0.23, blue: 0.46)], startPoint: .top, endPoint: .bottom)
                )
        }
        .frame(width: size, height: size)
        .accessibilityLabel("Zyteron")
    }
}
