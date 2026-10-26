package com.juno.marketplace

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query

private val JunoPink = Color(0xFFD9186C)
private val JunoPale = Color(0xFFFFF1F7)

data class Product(
    val id: String = "",
    val name: String = "",
    val category: String = "",
    val price: Double = 0.0,
    val mrp: Double = 0.0,
    val image: String? = null,
    val stock: Int? = null,
    val rating: Double? = null,
    val details: String? = null
)

interface JunoApi {
    @GET("api/products")
    suspend fun products(): ProductResponse
}
data class ProductResponse(val products: List<Product> = emptyList())

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { JunoApp() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JunoApp() {
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var query by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("All") }
    var selected by remember { mutableStateOf<Product?>(null) }
    var favourites by remember { mutableStateOf(setOf<String>()) }
    var cart by remember { mutableStateOf(setOf<String>()) }
    var showFavourites by remember { mutableStateOf(false) }
    var showCart by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            val api = Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
                .addConverterFactory(GsonConverterFactory.create()).build().create(JunoApi::class.java)
            products = api.products().products.filter { it.price in 1.0..500.0 }
            if (products.isEmpty()) error = "The product API did not return products. Check the backend catalogue endpoint."
        } catch (e: Exception) {
            error = "Could not load the live catalogue. Check the API endpoint and connection."
        } finally { loading = false }
    }

    val categories = listOf("All") + products.map { it.category }.filter { it.isNotBlank() }.distinct().sorted()
    val visible = products.filter { p ->
        (category == "All" || p.category == category) &&
        (p.name.contains(query, true) || p.category.contains(query, true) || (p.details ?: "").contains(query, true)) &&
        (!showFavourites || favourites.contains(p.id)) && (!showCart || cart.contains(p.id))
    }

    MaterialTheme(colorScheme = lightColorScheme(primary = JunoPink, secondary = Color(0xFF7D4BC1), background = Color.White)) {
        Scaffold(
            topBar = {
                Column(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Text("JUNO", fontSize = 27.sp, fontWeight = FontWeight.Black, color = JunoPink)
                            Text("Little finds. Lovely prices.", fontSize = 12.sp, color = Color.Gray)
                        }
                        Row {
                            IconButton(onClick = { showFavourites = !showFavourites; showCart = false }) {
                                Icon(if (showFavourites) Icons.Default.Favorite else Icons.Default.FavoriteBorder, "Wishlist")
                            }
                            IconButton(onClick = { showCart = !showCart; showFavourites = false }) {
                                BadgedBox(badge = { if (cart.isNotEmpty()) Badge { Text(cart.size.toString()) } }) {
                                    Icon(Icons.Default.ShoppingBag, "Cart")
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(query, { query = it }, modifier = Modifier.fillMaxWidth(), placeholder = { Text("Search clips, scrunchies, hoops…") }, leadingIcon = { Icon(Icons.Default.Search, null) }, singleLine = true, shape = RoundedCornerShape(14.dp))
                    Spacer(Modifier.height(8.dp))
                    Text(if (showFavourites) "Your wishlist" else if (showCart) "Your bag" else "Accessories under ₹500", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    if (categories.size > 1 && !showFavourites && !showCart) {
                        androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(categories) { c ->
                                FilterChip(selected = category == c, onClick = { category = c }, label = { Text(c) })
                            }
                        }
                    }
                }
            }
        ) { padding ->
            Column(Modifier.padding(padding).fillMaxSize().background(Color(0xFFFFFCFE))) {
                if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
                if (error != null) {
                    Text(error!!, color = Color(0xFF9B234B), modifier = Modifier.padding(16.dp))
                    Text("The app shell is ready; the live catalogue API must be confirmed before release.", fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(horizontal = 16.dp))
                }
                if (!loading && visible.isEmpty() && error == null) Text("No matching accessories yet.", modifier = Modifier.padding(20.dp))
                LazyColumn(contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(visible, key = { it.id }) { p ->
                        Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White), modifier = Modifier.fillMaxWidth().clickable { selected = p }) {
                            Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(112.dp).background(JunoPale, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                                    if (!p.image.isNullOrBlank()) AsyncImage(model = p.image, contentDescription = p.name, modifier = Modifier.fillMaxSize())
                                    else Text("Juno", color = JunoPink, fontWeight = FontWeight.Bold)
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(p.category, fontSize = 11.sp, color = Color.Gray)
                                    Text(p.name, fontWeight = FontWeight.SemiBold, maxLines = 2)
                                    Text("₹" + p.price.toInt(), fontSize = 19.sp, fontWeight = FontWeight.Black, color = JunoPink)
                                    if (p.mrp > p.price) Text("MRP ₹" + p.mrp.toInt(), fontSize = 12.sp, color = Color.Gray)
                                    Text(if ((p.stock ?: 1) > 0) "In stock" else "Currently unavailable", fontSize = 11.sp, color = if ((p.stock ?: 1) > 0) Color(0xFF18834A) else Color.Red)
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    IconButton(onClick = { favourites = if (favourites.contains(p.id)) favourites - p.id else favourites + p.id }) {
                                        Icon(if (favourites.contains(p.id)) Icons.Default.Favorite else Icons.Default.FavoriteBorder, "Add to wishlist", tint = JunoPink)
                                    }
                                    TextButton(onClick = { cart = cart + p.id }) { Text(if (cart.contains(p.id)) "Added" else "Add") }
                                }
                            }
                        }
                    }
                }
            }
        }
        if (selected != null) {
            val p = selected!!
            AlertDialog(onDismissRequest = { selected = null }, title = { Text(p.name) }, text = {
                Column {
                    if (!p.image.isNullOrBlank()) AsyncImage(model = p.image, contentDescription = p.name, modifier = Modifier.fillMaxWidth().height(180.dp))
                    Text(p.details ?: p.category)
                    Spacer(Modifier.height(8.dp))
                    Text("₹" + p.price.toInt(), color = JunoPink, fontWeight = FontWeight.Bold)
                    Text("Ratings and availability shown only when supplied by the catalogue.")
                }
            }, confirmButton = { TextButton(onClick = { cart = cart + p.id; selected = null }) { Text("Add to bag") } }, dismissButton = { TextButton(onClick = { selected = null }) { Text("Close") } })
        }
    }
}
