import SwiftUI

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
        cart = (UserDefaults.standard.dictionary(forKey: "juno.cart") as? [String: Int]) ?? [:]
        wishlist = Set(UserDefaults.standard.stringArray(forKey: "juno.wishlist") ?? [])
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
            let blocked = ["clothing", "dresses", "tops", "kurtis", "shirts", "trousers", "footwear", "men wear", "kids wear"]
            products = rows.dropFirst().compactMap { line in
                let row = Self.csvRow(line)
                let name = field(row, ["product name", "name"])
                let category = field(row, ["category"])
                let price = Int(field(row, ["selling price", "sellingprice", "price"])) ?? 0
                guard !name.isEmpty, (1...500).contains(price),
                      !blocked.contains(category.lowercased()) else { return nil }
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
                        ContentUnavailableView(store.status, systemImage: "bag", description: Text("Refresh to try the live catalogue again."))
                        Button("Retry") { Task { await store.refresh() } }.frame(maxWidth: .infinity)
                    }
                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(store.visibleProducts) { product in ProductCard(product: product)
                    }
                }
            }.padding(14)
            .navigationTitle("Discover")
            .toolbar { Button { Task { await store.refresh() } } label: { Image(systemName: "arrow.clockwise") }.accessibilityLabel("Refresh catalogue") }
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
            Text(product.rating > 0 ? "★ \(product.rating, specifier: "%.1f") · \(product.category)" : product.category)
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
                    ContentUnavailableView("Your bag is empty", systemImage: "bag", description: Text("Add a few lovely finds from the Shop tab."))
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
    var body: some View {
        NavigationStack {
            ContentUnavailableView("Your Juno account", systemImage: "person.crop.circle",
                                   description: Text("Secure sign-in, OTP verification, orders and profile settings require the shared account backend before release."))
                .navigationTitle("Account")
        }
    }
}
