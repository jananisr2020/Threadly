import SwiftUI
import Combine

private let junoPink = Color(red: 0.82, green: 0.08, blue: 0.36)
private let junoSoftPink = Color(red: 1.0, green: 0.94, blue: 0.97)

struct JunoProduct: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var category: String
    var price: Int
    var mrp: Int
    var rating: Double
    var stock: Int
    var image: String
    var details: String

    var discount: Int { mrp > price && mrp > 0 ? (mrp - price) * 100 / mrp : 0 }
}

@MainActor
final class JunoStore: ObservableObject {
    @Published private(set) var products: [JunoProduct] = []
    @Published var search = ""
    @Published var category = "All"
    @Published var cart: [String: Int] = [:] { didSet { persist(cart, key: "juno.cart") } }
    @Published var wishlist: Set<String> = [] { didSet { persist(Array(wishlist), key: "juno.wishlist") } }
    @Published var isLoading = false
    @Published var status = "Loading the latest Juno accessories…"

    init() {
        if let data = UserDefaults.standard.data(forKey: "juno.cart"),
           let saved = try? JSONDecoder().decode([String: Int].self, from: data) { cart = saved }
        if let data = UserDefaults.standard.data(forKey: "juno.wishlist"),
           let saved = try? JSONDecoder().decode([String].self, from: data) { wishlist = Set(saved) }
        Task { await refresh() }
    }

    var categories: [String] { ["All"] + Array(Set(products.map(\.category))).sorted() }
    var visibleProducts: [JunoProduct] {
        products.filter {
            $0.price > 0 && $0.price <= 500 &&
            (category == "All" || $0.category == category) &&
            (search.isEmpty || "\($0.name) \($0.category) \($0.details)".localizedCaseInsensitiveContains(search))
        }
    }
    var cartProducts: [JunoProduct] { products.filter { (cart[$0.id] ?? 0) > 0 } }
    var subtotal: Int { cartProducts.reduce(0) { $0 + $1.price * (cart[$1.id] ?? 0) } }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        guard let url = URL(string: "https://threadly-fashion.netlify.app/products.csv") else {
            status = "Catalogue URL is invalid."; return
        }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200,
                  let csv = String(data: data, encoding: .utf8) else {
                status = "Could not load the live catalogue. Pull to retry."; return
            }
            let rows = csv.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
            guard let header = rows.first.map(Self.csvRow), rows.count > 1 else {
                status = "The catalogue is currently empty."; return
            }
            func field(_ row: [String], _ keys: [String]) -> String {
                guard let index = header.firstIndex(where: { keys.contains($0.lowercased().trimmingCharacters(in: .whitespaces)) }), index < row.count else { return "" }
                return row[index].trimmingCharacters(in: .whitespacesAndNewlines)
            }
            // Juno is accessories-only. An allow-list prevents bags, clothing,
            // footwear and unknown categories from entering the mobile storefront.
            let allowed: Set<String> = ["hair clips", "claw clips", "hair bands", "scrunchies",
                                        "earrings", "necklaces", "bracelets", "bangles", "rings",
                                        "sunglasses", "watches", "phone cases", "keychains", "caps",
                                        "scarves", "belts"]
            products = rows.dropFirst().compactMap { line in
                let row = Self.csvRow(line)
                let name = field(row, ["product name", "name"])
                let category = field(row, ["category"])
                let price = Int(field(row, ["selling price", "sellingprice", "price"])) ?? 0
                guard !name.isEmpty, (1...500).contains(price),
                      allowed.contains(category.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()) else { return nil }
                let id = field(row, ["product id", "productid", "id"])
                return JunoProduct(id: id.isEmpty ? name : id, name: name, category: category.isEmpty ? "Accessories" : category,
                                   price: price, mrp: Int(field(row, ["mrp"])) ?? price,
                                   rating: Double(field(row, ["rating"])) ?? 0,
                                   stock: Int(field(row, ["stock"])) ?? -1,
                                   image: field(row, ["image", "image url", "imageurl"]),
                                   details: field(row, ["details", "description"]))
            }
            status = products.isEmpty ? "No eligible accessories found in the live catalogue." : ""
        } catch {
            status = "Catalogue connection failed. Check your connection and retry."
        }
    }

    func toggleWishlist(_ product: JunoProduct) {
        if wishlist.contains(product.id) { wishlist.remove(product.id) } else { wishlist.insert(product.id) }
    }
    func add(_ product: JunoProduct) { cart[product.id, default: 0] += 1 }
    func remove(_ product: JunoProduct) { cart.removeValue(forKey: product.id) }
    func changeQuantity(_ product: JunoProduct, by delta: Int) {
        let next = (cart[product.id] ?? 0) + delta
        if next <= 0 { cart.removeValue(forKey: product.id) } else { cart[product.id] = next }
    }
    private func persist<T: Encodable>(_ value: T, key: String) {
        if let data = try? JSONEncoder().encode(value) { UserDefaults.standard.set(data, forKey: key) }
    }
    private static func csvRow(_ line: String) -> [String] {
        var cells: [String] = [], cell = "", quoted = false
        let chars = Array(line); var index = 0
        while index < chars.count {
            let char = chars[index]
            if char == "\"" {
                if quoted && index + 1 < chars.count && chars[index + 1] == "\"" { cell.append("\""); index += 1 }
                else { quoted.toggle() }
            } else if char == "," && !quoted { cells.append(cell); cell = "" }
            else { cell.append(char) }
            index += 1
        }
        cells.append(cell)
        return cells
    }
}

@main
struct JunoApp: App {
    @StateObject private var store = JunoStore()
    var body: some Scene {
        WindowGroup { JunoRootView().environmentObject(store).preferredColorScheme(.light) }
    }
}

struct JunoRootView: View {
    var body: some View {
        TabView {
            CatalogueView().tabItem { Label("Shop", systemImage: "sparkles") }
            WishlistView().tabItem { Label("Wishlist", systemImage: "heart") }
            CartView().tabItem { Label("Bag", systemImage: "bag") }
            AccountView().tabItem { Label("Account", systemImage: "person.crop.circle") }
        }.tint(junoPink)
    }
}

struct CatalogueView: View {
    @EnvironmentObject private var store: JunoStore
    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("JUNO").font(.system(size: 29, weight: .black, design: .rounded)).foregroundStyle(junoPink)
                        Text("Little finds. Lovely prices.").font(.subheadline)
                        Text("Accessories under ₹500").font(.caption.bold()).foregroundStyle(junoPink)
                    }.frame(maxWidth: .infinity, alignment: .leading).padding(16).background(junoSoftPink, in: RoundedRectangle(cornerRadius: 18))
                    TextField("Search clips, scrunchies, hoops…", text: $store.search)
                        .textFieldStyle(.roundedBorder)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(store.categories, id: \.self) { category in
                                Button(category) { store.category = category }
                                    .font(.caption.bold()).padding(.horizontal, 13).padding(.vertical, 9)
                                    .background(store.category == category ? junoPink : junoSoftPink, in: Capsule())
                                    .foregroundStyle(store.category == category ? .white : junoPink)
                            }
                        }
                    }
                    if store.isLoading { ProgressView().frame(maxWidth: .infinity) }
                    if !store.status.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "bag").font(.largeTitle).foregroundStyle(junoPink)
                            Text(store.status).font(.subheadline).multilineTextAlignment(.center)
                            Text("Refresh to try the live catalogue again.").font(.caption).foregroundStyle(.secondary)
                            Button("Retry") { Task { await store.refresh() } }
                                .buttonStyle(.borderedProminent).tint(junoPink)
                        }
                        .frame(maxWidth: .infinity).padding(24)
                    }
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(store.visibleProducts) { product in
                            ProductCard(product: product)
                        }
                    }
                }.padding(14)
            }
            .navigationTitle("Discover")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { Task { await store.refresh() } } label: {
                        Image(systemName: "arrow.clockwise")
                    }.accessibilityLabel("Refresh catalogue")
                }
            }
        }
    }
}

struct ProductCard: View {
    @EnvironmentObject private var store: JunoStore
    let product: JunoProduct
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 14).fill(junoSoftPink).frame(height: 135)
                if let url = URL(string: product.image), !product.image.isEmpty {
                    AsyncImage(url: url) { image in image.resizable().scaledToFill() } placeholder: { Image(systemName: "sparkles").font(.largeTitle).foregroundStyle(junoPink) }
                        .frame(height: 135).frame(maxWidth: .infinity).clipShape(RoundedRectangle(cornerRadius: 14))
                } else { Image(systemName: "sparkles").font(.largeTitle).foregroundStyle(junoPink).frame(maxWidth: .infinity).frame(height: 135) }
                Button { store.toggleWishlist(product) } label: {
                    Image(systemName: store.wishlist.contains(product.id) ? "heart.fill" : "heart")
                        .foregroundStyle(junoPink).padding(8).background(.white.opacity(0.95), in: Circle())
                }.padding(7).accessibilityLabel("Toggle wishlist for \(product.name)")
            }
            Text(product.name).font(.subheadline.weight(.semibold)).lineLimit(2).frame(height: 38, alignment: .topLeading)
            HStack(spacing: 5) {
                Text("₹\(product.price)").font(.headline)
                if product.discount > 0 { Text("\(product.discount)% off").font(.caption2).foregroundStyle(.green) }
            }
            Text(product.rating > 0 ? "★ \(String(format: "%.1f", product.rating)) · \(product.category)" : product.category)
                .font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            Button { store.add(product) } label: { Text("Add to bag").frame(maxWidth: .infinity) }
                .buttonStyle(.borderedProminent).tint(junoPink).disabled(product.stock == 0)
        }.padding(9).background(.white, in: RoundedRectangle(cornerRadius: 17))
            .overlay(RoundedRectangle(cornerRadius: 17).stroke(junoSoftPink, lineWidth: 1))
    }
}

struct WishlistView: View {
    @EnvironmentObject private var store: JunoStore
    var body: some View {
        NavigationStack {
            List(store.products.filter { store.wishlist.contains($0.id) }) { product in
                HStack {
                    VStack(alignment: .leading) { Text(product.name).font(.headline); Text("₹\(product.price)").foregroundStyle(.secondary) }
                    Spacer()
                    Button("Add to bag") { store.add(product) }.tint(junoPink)
                    Button { store.toggleWishlist(product) } label: { Image(systemName: "heart.slash") }.tint(junoPink)
                }
            }.navigationTitle("Your wishlist")
        }
    }
}

struct CartView: View {
    @EnvironmentObject private var store: JunoStore
    var body: some View {
        NavigationStack {
            Group {
                if store.cartProducts.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "bag").font(.largeTitle).foregroundStyle(junoPink)
                        Text("Your bag is empty").font(.headline)
                        Text("Add a few lovely finds from the Shop tab.").font(.subheadline).foregroundStyle(.secondary)
                    }.frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(store.cartProducts) { product in
                            HStack {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(product.name).font(.headline)
                                    Text("₹\(product.price) each").font(.caption).foregroundStyle(.secondary)
                                    HStack {
                                        Button { store.changeQuantity(product, by: -1) } label: { Image(systemName: "minus.circle") }
                                        Text("\(store.cart[product.id] ?? 0)").monospacedDigit()
                                        Button { store.changeQuantity(product, by: 1) } label: { Image(systemName: "plus.circle") }
                                    }.tint(junoPink)
                                }
                                Spacer()
                                Text("₹\(product.price * (store.cart[product.id] ?? 0))").bold()
                            }
                        }
                        Section {
                            HStack { Text("Subtotal"); Spacer(); Text("₹\(store.subtotal)").bold() }
                            Text("Cash on delivery is not available.").font(.caption).foregroundStyle(.secondary)
                            Text("Secure prepaid checkout will be enabled after the verified payment API is connected.").font(.caption)
                        }
                    }
                }
            }.navigationTitle("Your bag")
        }
    }
}

struct AccountView: View {
    @AppStorage("juno.account.token") private var token = ""
    @AppStorage("juno.account.email") private var savedEmail = ""
    @AppStorage("juno.account.name") private var savedName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var creating = false
    @State private var busy = false
    @State private var message = ""
    @State private var orders: [[String: Any]] = []
    private let baseURL = "https://threadly-fashion.netlify.app"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    Image(systemName: "person.crop.circle").font(.system(size: 48)).foregroundStyle(junoPink)
                    Text("Your Juno account").font(.title2.bold())
                    if !token.isEmpty {
                        Text("Signed in").font(.headline).foregroundStyle(.green)
                        Text(savedName.isEmpty ? "Juno customer" : savedName).font(.title3.bold())
                        Text(savedEmail).foregroundStyle(.secondary)
                        Button(busy ? "Loading orders…" : "Refresh my orders") {
                            Task { await loadOrders() }
                        }.buttonStyle(.borderedProminent).tint(junoPink).disabled(busy)
                        if !message.isEmpty { Text(message).font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center) }
                        ForEach(Array(orders.enumerated()), id: \.offset) { _, order in
                            VStack(alignment: .leading, spacing: 5) {
                                Text("Order " + (order["id"] as? String ?? "—")).font(.headline).foregroundStyle(junoPink)
                                Text("Date: " + (order["date"] as? String ?? "—"))
                                Text("Status: " + (order["status"] as? String ?? "New")).fontWeight(.semibold)
                                Text("Total: ₹\(order["total"] as? Int ?? (order["total"] as? NSNumber)?.intValue ?? 0)")
                                if let tracking = order["tracking"] as? String, !tracking.isEmpty { Text("Tracking: " + tracking) }
                            }.font(.subheadline).frame(maxWidth: .infinity, alignment: .leading).padding(12)
                                .background(junoSoftPink, in: RoundedRectangle(cornerRadius: 12))
                        }
                        Button("Sign out", role: .destructive) {
                            token = ""; savedEmail = ""; savedName = ""; orders = []; message = "Signed out."
                        }.buttonStyle(.bordered).padding(.top, 4)
                    } else {
                        Text(creating ? "Create your Juno account" : "Sign in to view your orders")
                            .foregroundStyle(.secondary)
                        if creating {
                            TextField("Name", text: $name).textContentType(.name).textFieldStyle(.roundedBorder)
                        }
                        TextField("Email", text: $email).textContentType(.emailAddress)
                            .keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                            .textFieldStyle(.roundedBorder)
                        SecureField("Password (minimum 8 characters)", text: $password)
                            .textContentType(creating ? .newPassword : .password).textFieldStyle(.roundedBorder)
                        Button(busy ? "Please wait…" : (creating ? "Create account" : "Sign in")) {
                            Task { await authenticate() }
                        }.buttonStyle(.borderedProminent).tint(junoPink).disabled(busy || email.isEmpty || password.isEmpty)
                        Button(creating ? "Already have an account? Sign in" : "New to Juno? Create account") {
                            creating.toggle(); message = ""
                        }.foregroundStyle(junoPink)
                        if !creating {
                            Button("Forgot password? Email me a reset link") {
                                Task { await requestPasswordReset() }
                            }.disabled(busy || email.isEmpty).foregroundStyle(junoPink)
                        }
                        Text("Use the same Juno account as the website. Never share your password.")
                            .font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    }
                    if !message.isEmpty {
                        Text(message).font(.subheadline).multilineTextAlignment(.center)
                            .foregroundStyle(message.localizedCaseInsensitiveContains("success") ? .green : .secondary)
                    }
                }.padding(20)
            }.navigationTitle("Account")
        }
    }

    private func request(_ path: String, method: String = "POST", body: [String: Any]? = nil) async throws -> (Data, Int) {
        guard let url = URL(string: baseURL + path) else { throw URLError(.badURL) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !token.isEmpty { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }

    private func authenticate() async {
        busy = true; defer { busy = false }
        do {
            let path = creating ? "/signup" : "/login"
            let body: [String: Any] = creating
                ? ["name": name, "email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), "password": password]
                : ["email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), "password": password]
            let (data, code) = try await request(path, body: body)
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
            guard (200..<300).contains(code), let newToken = json["token"] as? String,
                  let user = json["user"] as? [String: Any] else {
                message = json["error"] as? String ?? "Could not sign in. Please try again."
                return
            }
            token = newToken
            savedEmail = user["email"] as? String ?? email
            savedName = user["name"] as? String ?? name
            password = ""; message = "Signed in successfully."
            await loadOrders()
        } catch { message = "Could not connect to Juno. Check your connection and retry." }
    }

    private func requestPasswordReset() async {
        busy = true; defer { busy = false }
        do {
            let (data, code) = try await request("/forgot", body: ["email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()])
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
            if (200..<300).contains(code) {
                message = json["message"] as? String ?? "If your account exists, a password-reset email will be sent."
            } else { message = json["error"] as? String ?? "Could not request a password reset." }
        } catch { message = "Could not connect to Juno. Please retry." }
    }

    private func loadOrders() async {
        guard !token.isEmpty else { return }
        busy = true; defer { busy = false }
        do {
            let (data, code) = try await request("/my-orders", method: "GET")
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]]
            guard (200..<300).contains(code), let json else {
                let errorJSON = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                message = errorJSON?["error"] as? String ?? "Could not load your orders."
                return
            }
            orders = json
            message = json.isEmpty ? "You have no orders yet." : "Your latest orders are shown below."
        } catch { message = "Could not load orders. Check your connection and retry." }
    }
}

