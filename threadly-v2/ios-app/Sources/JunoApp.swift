import SwiftUI
import WebKit

@main
struct JunoApp: App {
    var body: some Scene {
        WindowGroup {
            StorefrontView().preferredColorScheme(.light)
        }
    }
}

struct StorefrontView: View {
    @State private var reloadToken = UUID()

    var body: some View {
        NavigationStack {
            StorefrontWebView(reloadToken: reloadToken)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle("Juno")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { reloadToken = UUID() } label: {
                            Image(systemName: "arrow.clockwise")
                        }.accessibilityLabel("Reload Juno")
                    }
                }
        }
        .tint(Color(red: 0.82, green: 0.08, blue: 0.36))
    }
}

struct StorefrontWebView: UIViewRepresentable {
    let reloadToken: UUID
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        if let url = URL(string: "https://threadly-fashion.netlify.app/") {
            webView.load(URLRequest(url: url))
        }
        context.coordinator.lastReloadToken = reloadToken
        return webView
    }
    func updateUIView(_ webView: WKWebView, context: Context) {
        guard context.coordinator.lastReloadToken != reloadToken else { return }
        context.coordinator.lastReloadToken = reloadToken
        webView.reload()
    }
    func makeCoordinator() -> Coordinator { Coordinator() }
    final class Coordinator { var lastReloadToken: UUID? }
}
