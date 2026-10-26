package in.juno.shop

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private val Pink = Color(0xFFD9186C)
private val SoftPink = Color(0xFFFFF1F7)
data class Product(val id:String,val name:String,val category:String,val price:Int,val mrp:Int,val rating:Double,val stock:Int,val image:String="",val details:String="") {
 val discount:Int get()=if(mrp>price&&mrp>0)(mrp-price)*100/mrp else 0
}
private val sample=listOf(
 Product("JN001","Pastel Hair Clip","Hair Clips",45,90,4.4,24),
 Product("JN002","Matte Claw Clip","Claw Clips",72,120,4.6,18),
 Product("JN003","Satin Scrunchie","Scrunchies",49,99,4.5,35),
 Product("JN004","Everyday Hoop Earrings","Earrings",99,180,4.2,12),
 Product("JN005","Pastel Bracelet Set","Bracelets",129,249,4.3,15),
 Product("JN006","Pearl Hair Clip","Hair Clips",59,110,4.7,9),
 Product("JN007","Minimal Pendant Necklace","Necklaces",149,299,4.1,7),
 Product("JN008","Mini Claw Clips Set","Claw Clips",39,79,4.5,42)
)
class ShopModel:ViewModel(){
 var products by mutableStateOf(sample); private set
 var search by mutableStateOf(""); var category by mutableStateOf("All")
 var selected by mutableStateOf<Product?>(null); var tab by mutableStateOf("Home")
 var wishlist by mutableStateOf(setOf<String>()); var cart by mutableStateOf<Map<String,Int>>(emptyMap())
 var loading by mutableStateOf(false); var notice by mutableStateOf("Sample catalogue until live API response is confirmed.")
 init { refresh() }
 fun refresh(){viewModelScope.launch{loading=true;try{val list=withContext(Dispatchers.IO){load()};if(list.isNotEmpty()){products=list;notice=""}}catch(_:Exception){notice="Live catalogue unavailable; showing sample products."}finally{loading=false}}}
 private fun load():List<Product>{
  val c=URL(BuildConfig.API_BASE_URL+"/catalog.json").openConnection() as HttpURLConnection
  c.connectTimeout=4500;c.readTimeout=4500
  try{if(c.responseCode !in 200..299)return emptyList();val root=JSONObject(c.inputStream.bufferedReader().use{it.readText()});val arr=root.optJSONArray("products")?:return emptyList()
   return buildList{for(i in 0 until arr.length()){val p=arr.optJSONObject(i)?:continue;val price=p.optInt("sellingPrice",p.optInt("price",0));val name=p.optString("name",p.optString("productName"));if(price in 1..500&&name.isNotBlank())add(Product(p.optString("id",p.optString("productId")),name,p.optString("category","Accessories"),price,p.optInt("mrp",price),p.optDouble("rating",0.0),p.optInt("stock",-1),p.optString("image",p.optString("imageUrl","")),p.optString("details","")))}}
  }finally{c.disconnect()}
 }
 val filtered get()=products.filter{it.price in 1..500&&(category=="All"||it.category==category)&&(search.isBlank()||"${it.name} ${it.category} ${it.details}".contains(search,true))}
 fun wish(p:Product){wishlist=if(p.id in wishlist)wishlist-p.id else wishlist+p.id}
 fun add(p:Product){cart=cart+(p.id to ((cart[p.id]?:0)+1))}
 fun total()=products.sumOf{it.price*(cart[it.id]?:0)}
}
class MainActivity:ComponentActivity(){override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);setContent{MaterialTheme(colorScheme=lightColorScheme(primary=Pink)){JunoApp()}}}}
@Composable fun JunoApp(vm:ShopModel=viewModel()){
 Scaffold(bottomBar={NavigationBar(containerColor=Color.White){listOf("Home","Wishlist","Cart","Account").forEach{label->val icon=when(label){"Home"->Icons.Default.Home;"Wishlist"->Icons.Default.Favorite;"Cart"->Icons.Default.ShoppingBag;else->Icons.Default.Person};NavigationBarItem(selected=vm.tab==label,onClick={vm.tab=label;vm.selected=null},icon={Icon(icon,null)},label={Text(label)})}}}){pad->
 Column(Modifier.fillMaxSize().padding(pad).background(Color.White)){
 if(vm.selected!=null) Detail(vm,vm.selected!!){vm.selected=null} else when(vm.tab){
 "Wishlist"->Listing(vm,vm.products.filter{it.id in vm.wishlist},"Your wishlist")
 "Cart"->Cart(vm)
 "Account"->Column(Modifier.padding(20.dp)){Text("Your Juno account",fontSize=25.sp,fontWeight=FontWeight.Bold);Text("Connect the verified shared login and OTP API before release.",Modifier.padding(top=12.dp));Text("No credentials are collected by this starter.",color=Color.Gray)}
 else->Home(vm)
 }
 }
 }
}
@Composable fun Header(vm:ShopModel){Column(Modifier.fillMaxWidth().background(SoftPink).padding(16.dp)){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Column{Text("JUNO",fontSize=27.sp,fontWeight=FontWeight.Black,color=Pink,letterSpacing=1.sp);Text("Little finds. Lovely prices.",fontSize=11.sp)};Text("Under ₹500",color=Pink,fontWeight=FontWeight.Bold)};Spacer(Modifier.height(10.dp));OutlinedTextField(vm.search,{vm.search=it},Modifier.fillMaxWidth(),singleLine=true,placeholder={Text("Search clips, scrunchies, hoops…")},leadingIcon={Icon(Icons.Default.Search,null)})}}
@Composable fun Home(vm:ShopModel){Header(vm);Column{Text("Shop by category",fontSize=18.sp,fontWeight=FontWeight.Bold,modifier=Modifier.padding(start=14.dp,top=12.dp));Row(Modifier.fillMaxWidth().padding(horizontal=8.dp),horizontalArrangement=Arrangement.spacedBy(4.dp)){(listOf("All")+vm.products.map{it.category}.distinct().take(4)).forEach{FilterChip(vm.category==it,{vm.category=it},{Text(it,maxLines=1,overflow=TextOverflow.Ellipsis)})}};Row(Modifier.fillMaxWidth().padding(horizontal=14.dp),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text("Trending accessories",fontSize=20.sp,fontWeight=FontWeight.ExtraBold);TextButton(onClick={vm.refresh()}){Text("Refresh")}};if(vm.loading)LinearProgressIndicator(Modifier.fillMaxWidth());if(vm.notice.isNotBlank())Text(vm.notice,Modifier.padding(horizontal=14.dp),fontSize=11.sp,color=Color.Gray)
 LazyVerticalGrid(GridCells.Fixed(2),contentPadding=PaddingValues(10.dp),horizontalArrangement=Arrangement.spacedBy(9.dp),verticalArrangement=Arrangement.spacedBy(9.dp)){items(vm.filtered){p->CardProduct(p,p.id in vm.wishlist,{vm.selected=p},{vm.wish(p)},{vm.add(p)})}}
}}
@Composable fun CardProduct(p:Product,wished:Boolean,open:()->Unit,wish:()->Unit,add:()->Unit){Card(modifier=Modifier.fillMaxWidth().clickable{open()},shape=RoundedCornerShape(14.dp)){Column{Box(Modifier.fillMaxWidth().height(135.dp).background(SoftPink),contentAlignment=Alignment.Center){if(p.image.isNotBlank())AsyncImage(p.image,p.name,Modifier.fillMaxSize())else Text("✦",fontSize=48.sp,color=Pink);IconButton(onClick=wish,modifier=Modifier.align(Alignment.TopEnd)){Icon(if(wished)Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,null,tint=Pink)}};Column(Modifier.padding(9.dp)){Text(p.name,minLines=2,maxLines=2,overflow=TextOverflow.Ellipsis,fontWeight=FontWeight.SemiBold);Row(verticalAlignment=Alignment.CenterVertically){Text("₹${p.price}",fontWeight=FontWeight.ExtraBold,fontSize=17.sp);if(p.discount>0)Text(" ${p.discount}% off",fontSize=10.sp,color=Color(0xFF16834A))};Text("★ ${p.rating} · ${p.category}",fontSize=10.sp,color=Color.Gray);Button(onClick=add,modifier=Modifier.fillMaxWidth()){Text("Add to bag")}}}}}
@Composable fun Detail(vm:ShopModel,p:Product,back:()->Unit){Column(Modifier.fillMaxSize().padding(16.dp)){TextButton(onClick=back){Text("← Back")};if(p.image.isNotBlank())AsyncImage(p.image,p.name,Modifier.fillMaxWidth().height(260.dp))else Box(Modifier.fillMaxWidth().height(220.dp).background(SoftPink),contentAlignment=Alignment.Center){Text("✦",fontSize=70.sp,color=Pink)};Text(p.name,fontSize=26.sp,fontWeight=FontWeight.ExtraBold);Text(p.details.ifBlank{p.category},color=Color.Gray);Text("₹${p.price}   ₹${p.mrp}   ${p.discount}% off",fontSize=21.sp,fontWeight=FontWeight.Bold);Text("★ ${p.rating} · stock ${if(p.stock<0)"to be confirmed" else p.stock}",fontSize=12.sp);Text("Delivery estimate and PIN-code availability must be confirmed with the live service.",fontSize=12.sp,color=Color.Gray);Button(onClick={vm.add(p);back()},enabled=p.stock!=0,modifier=Modifier.fillMaxWidth()){Text("Add to bag")};OutlinedButton(onClick={vm.wish(p)},modifier=Modifier.fillMaxWidth()){Text(if(p.id in vm.wishlist)"Saved to wishlist" else "Add to wishlist")}}}
@Composable fun Listing(vm:ShopModel,ps:List<Product>,title:String){Column{Text(title,fontSize=25.sp,fontWeight=FontWeight.Bold,modifier=Modifier.padding(16.dp));LazyVerticalGrid(GridCells.Fixed(2),contentPadding=PaddingValues(10.dp)){items(ps){p->CardProduct(p,p.id in vm.wishlist,{vm.selected=p},{vm.wish(p)},{vm.add(p)})}}}}
@Composable fun Cart(vm:ShopModel){val ps=vm.products.filter{(vm.cart[it.id]?:0)>0};Column(Modifier.fillMaxSize().padding(16.dp)){Text("Your bag",fontSize=26.sp,fontWeight=FontWeight.Bold);if(ps.isEmpty())Text("Your bag is empty.",Modifier.padding(top=16.dp));ps.forEach{p->Row(Modifier.fillMaxWidth().padding(vertical=8.dp),horizontalArrangement=Arrangement.SpaceBetween){Column(Modifier.weight(1f)){Text(p.name,fontWeight=FontWeight.SemiBold);Text("${vm.cart[p.id]} × ₹${p.price}",color=Color.Gray)};Text("₹${p.price*(vm.cart[p.id]?:0)}");TextButton(onClick={vm.cart=vm.cart-p.id}){Text("Remove")}}};Spacer(Modifier.weight(1f));Text("Subtotal: ₹${vm.total()}",fontSize=20.sp,fontWeight=FontWeight.Bold);Text("Cash on delivery is not available.",fontSize=12.sp,color=Color.Gray);Button(onClick={},enabled=ps.isNotEmpty(),modifier=Modifier.fillMaxWidth()){Text("Checkout integration required")};Text("Payments are not simulated. Connect verified order creation and Razorpay before release.",fontSize=11.sp,color=Color.Gray)}}
