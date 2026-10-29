package in.juno.shop

import android.app.Application
import android.os.Bundle
import android.app.Activity
import androidx.activity.ComponentActivity
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
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
import androidx.lifecycle.AndroidViewModel
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

class ShopModel(application:Application):AndroidViewModel(application){
 private val prefs = application.getSharedPreferences("juno_shop_state", Application.MODE_PRIVATE)
 private fun restoreIds(key:String):Set<String> = prefs.getStringSet(key, emptySet())?.toSet() ?: emptySet()
 private fun restoreCart():Map<String,Int> = runCatching {
  val json=JSONObject(prefs.getString("cart_json","{}") ?: "{}")
  buildMap { val keys=json.keys(); while(keys.hasNext()){val k=keys.next();val qty=json.optInt(k,0);if(qty>0)put(k,qty)} }
 }.getOrDefault(emptyMap())
 private fun saveWishlist(){prefs.edit().putStringSet("wishlist_ids",wishlist.toSet()).apply()}
 private fun saveCart(){val json=JSONObject();cart.forEach{(id,qty)->if(qty>0)json.put(id,qty)};prefs.edit().putString("cart_json",json.toString()).apply()}
 var products by mutableStateOf<List<Product>>(emptyList()); private set
 var search by mutableStateOf(""); var category by mutableStateOf("All")
 var selected by mutableStateOf<Product?>(null); var tab by mutableStateOf("Home")
 var wishlist by mutableStateOf(restoreIds("wishlist_ids")); var cart by mutableStateOf(restoreCart())
 var loading by mutableStateOf(false); var notice by mutableStateOf("Loading the live Juno catalogue…")
 var accountEmail by mutableStateOf(prefs.getString("account_email","") ?: "")
 var accountName by mutableStateOf(prefs.getString("account_name","") ?: "")
 var authToken by mutableStateOf(prefs.getString("auth_token","") ?: "")
 var authMessage by mutableStateOf("")
 var authBusy by mutableStateOf(false)
 var orders by mutableStateOf<List<JSONObject>>(emptyList())
 var ordersBusy by mutableStateOf(false)
 var ordersMessage by mutableStateOf("")
 var checkoutBusy by mutableStateOf(false)
 var checkoutMessage by mutableStateOf("")
 var addressName by mutableStateOf("")
 var addressPhone by mutableStateOf("")
 var addressLine by mutableStateOf("")
 var addressPin by mutableStateOf("")
 var coupon by mutableStateOf("")
 private var pendingOrderToken = ""
 fun loadOrders(){
  if(authToken.isBlank()){ordersMessage="Sign in to view your orders.";return}
  viewModelScope.launch{
   ordersBusy=true;ordersMessage=""
   try{
    orders=withContext(Dispatchers.IO){
     val c=URL(BuildConfig.API_BASE_URL+"/my-orders").openConnection() as HttpURLConnection
     c.requestMethod="GET";c.connectTimeout=10000;c.readTimeout=10000
     c.setRequestProperty("Accept","application/json");c.setRequestProperty("Authorization","Bearer "+authToken)
     try{
      val code=c.responseCode
      val stream=if(code in 200..299)c.inputStream else c.errorStream
      val raw=stream?.bufferedReader()?.use{it.readText()}?:"[]"
      if(code !in 200..299){val err=runCatching{JSONObject(raw).optString("error")}.getOrDefault("Could not load orders (HTTP "+code+").");throw IllegalStateException(err)}
      val arr=org.json.JSONArray(raw)
      buildList{for(i in 0 until arr.length()){val item=arr.optJSONObject(i)?:continue;add(item)}}
     }finally{c.disconnect()}
    }
    ordersMessage=if(orders.isEmpty())"No orders found for this account yet." else ""
   }catch(e:Exception){ordersMessage=e.message?.take(180) ?: "Could not load your orders. Try again."}
   finally{ordersBusy=false}
  }
 }
 init { refresh() }
 fun login(emailInput:String,password:String){
  val email=emailInput.trim().lowercase()
  if(!email.contains("@")||password.isBlank()){authMessage="Enter a valid email and password.";return}
  viewModelScope.launch{
   authBusy=true;authMessage=""
   try{
    val result=withContext(Dispatchers.IO){postJson("/login",JSONObject().put("email",email).put("password",password))}
    val token=result.optString("token")
    if(token.isBlank()) throw IllegalStateException(result.optString("error","Login could not be completed."))
    val user=result.optJSONObject("user")
    accountEmail=user?.optString("email",email) ?: email
    accountName=user?.optString("name","") ?: ""
    authToken=token
    prefs.edit().putString("account_email",accountEmail).putString("account_name",accountName).putString("auth_token",token).apply()
    authMessage="Signed in successfully."
   }catch(e:Exception){authMessage=e.message?.take(180) ?: "Could not sign in. Check your connection and try again."}
   finally{authBusy=false}
  }
 }
 fun signup(nameInput:String,emailInput:String,password:String){
  val name=nameInput.trim();val email=emailInput.trim().lowercase()
  if(name.length<2||!email.contains("@")||password.length<8){authMessage="Enter your name, a valid email and a password of at least 8 characters.";return}
  viewModelScope.launch{
   authBusy=true;authMessage=""
   try{
    val result=withContext(Dispatchers.IO){postJson("/signup",JSONObject().put("name",name).put("email",email).put("password",password))}
    val token=result.optString("token")
    if(token.isBlank())throw IllegalStateException(result.optString("error","Account could not be created."))
    val user=result.optJSONObject("user")
    accountEmail=user?.optString("email",email) ?: email;accountName=user?.optString("name",name) ?: name;authToken=token
    prefs.edit().putString("account_email",accountEmail).putString("account_name",accountName).putString("auth_token",token).apply()
    authMessage="Account created successfully."
   }catch(e:Exception){authMessage=e.message?.take(180) ?: "Could not create account. Try again."}
   finally{authBusy=false}
  }
 }
 fun logout(){authToken="";accountEmail="";accountName="";authMessage="You are signed out.";prefs.edit().remove("auth_token").remove("account_email").remove("account_name").apply()}
 fun requestPasswordReset(emailInput:String){
  val email=emailInput.trim().lowercase()
  if(!email.contains("@")){authMessage="Enter your account email first.";return}
  viewModelScope.launch{
   authBusy=true;authMessage=""
   try{
    val result=withContext(Dispatchers.IO){postJson("/forgot",JSONObject().put("email",email))}
    authMessage=if(result.optBoolean("ok"))"If the account exists, a password reset link will be sent. Check your email." else result.optString("error","Could not request a reset.")
   }catch(e:Exception){authMessage=e.message?.take(180) ?: "Could not request a password reset. Try again."}
   finally{authBusy=false}
  }
 }
 fun startCheckout(activity:Activity){
  if(authToken.isBlank()){checkoutMessage="Please sign in before checkout.";tab="Account";return}
  val items=products.filter{(cart[it.id]?:0)>0}
  if(items.isEmpty()){checkoutMessage="Your bag is empty.";return}
  if(addressName.trim().length<2||!addressPhone.matches(Regex("[6-9][0-9]{9}"))||addressLine.trim().length<8||!addressPin.matches(Regex("[0-9]{6}"))){checkoutMessage="Enter your name, 10-digit mobile number, full address and 6-digit Tamil Nadu PIN code.";return}
  viewModelScope.launch{
   checkoutBusy=true;checkoutMessage=""
   try{
    val created=withContext(Dispatchers.IO){
     val body=JSONObject().put("method","UPI").put("coupon",coupon.trim().uppercase())
     val addr=JSONObject().put("name",addressName.trim()).put("phone",addressPhone.trim()).put("line",addressLine.trim()).put("pin",addressPin.trim())
     body.put("addr",addr)
     val arr=org.json.JSONArray()
     items.forEach{p->arr.put(JSONObject().put("id",p.id).put("n",cart[p.id]?:0).put("s",""))}
     body.put("items",arr)
     postAuthenticated("/create-order",body)
    }
    val key=created.optString("key");val rzpOrder=created.optString("id");pendingOrderToken=created.optString("orderToken")
    if(key.isBlank()||rzpOrder.isBlank()||pendingOrderToken.isBlank())throw IllegalStateException("Online payment is not configured. Please try again later.")
    val options=JSONObject().put("key",key).put("name","Juno").put("description","Juno accessories order").put("currency","INR").put("amount",created.optInt("amount")).put("order_id",rzpOrder).put("prefill",JSONObject().put("email",accountEmail).put("contact",addressPhone.trim())).put("theme",JSONObject().put("color","#D9186C"))
    withContext(Dispatchers.Main){Checkout().open(activity,options)}
   }catch(e:Exception){checkoutMessage=e.message?.take(180)?: "Could not start secure checkout."}
   finally{checkoutBusy=false}
  }
 }
 fun onPaymentSuccess(data:PaymentData){
  val orderId=data.orderId ?: "";val paymentId=data.paymentId ?: "";val signature=data.signature ?: "";val token=pendingOrderToken
  if(orderId.isBlank()||paymentId.isBlank()||signature.isBlank()||token.isBlank()){checkoutMessage="Payment response is incomplete. Do not pay again; check My Orders or contact support.";return}
  viewModelScope.launch{
   checkoutBusy=true;checkoutMessage="Verifying payment securely…"
   try{
    val result=withContext(Dispatchers.IO){postAuthenticated("/verify-payment",JSONObject().put("razorpay_order_id",orderId).put("razorpay_payment_id",paymentId).put("razorpay_signature",signature).put("orderToken",token))}
    if(!result.optBoolean("ok"))throw IllegalStateException(result.optString("error","Payment verification is pending."))
    cart=emptyMap();saveCart();ordersMessage="";checkoutMessage="Payment verified! Order "+result.optString("orderId")+" is confirmed.";tab="Account";loadOrders()
   }catch(e:Exception){checkoutMessage=e.message?.take(220)?: "Payment verification is pending. Do not pay again; check My Orders."}
   finally{checkoutBusy=false;pendingOrderToken=""}
  }
 }
 fun onPaymentError(code:Int,message:String?){checkoutMessage=if(message.isNullOrBlank())"Payment was not completed. Your cart is still saved." else "Payment not completed: "+message.take(160);pendingOrderToken=""}
 private fun postAuthenticated(path:String,body:JSONObject):JSONObject{
  val c=URL(BuildConfig.API_BASE_URL+path).openConnection() as HttpURLConnection
  c.requestMethod="POST";c.connectTimeout=15000;c.readTimeout=15000;c.doOutput=true
  c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("Accept","application/json");c.setRequestProperty("Authorization","Bearer "+authToken)
  return try{
   c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}
   val code=c.responseCode;val stream=if(code in 200..299)c.inputStream else c.errorStream
   val raw=stream?.bufferedReader()?.use{it.readText()}?:"{}"
   val result=runCatching{JSONObject(raw)}.getOrElse{JSONObject()}
   if(code !in 200..299)throw IllegalStateException(result.optString("error","Request failed (HTTP $code)."))
   result
  }finally{c.disconnect()}
 }
 private fun postJson(path:String,body:JSONObject):JSONObject{
  val c=URL(BuildConfig.API_BASE_URL+path).openConnection() as HttpURLConnection
  c.requestMethod="POST";c.connectTimeout=10000;c.readTimeout=10000;c.doOutput=true
  c.setRequestProperty("Content-Type","application/json")
  c.setRequestProperty("Accept","application/json")
  return try{
   c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}
   val code=c.responseCode
   val stream=if(code in 200..299)c.inputStream else c.errorStream
   val text=stream?.bufferedReader()?.use{it.readText()} ?: "{}"
   val result=runCatching{JSONObject(text)}.getOrElse{JSONObject()}
   if(code !in 200..299)throw IllegalStateException(result.optString("error","Request failed (HTTP $code)."))
   result
  }finally{c.disconnect()}
 }
 fun refresh(){viewModelScope.launch{loading=true;try{val list=withContext(Dispatchers.IO){load()};if(list.isNotEmpty()){products=list;notice=""}else{products=emptyList();notice="No eligible accessories are available from the live catalogue right now. Tap Refresh to try again."}}catch(_:Exception){if(products.isEmpty())notice="Could not connect to the live Juno catalogue. Check your connection and tap Refresh. No sample products are shown."}finally{loading=false}}}
 private fun load():List<Product>{
  // Prefer a structured API, but use the repository's real CSV catalogue when that endpoint is absent.
  val json=fetchText("/catalog.json")
  if(json!=null){
   try{
    val root=JSONObject(json);val arr=root.optJSONArray("products")
    if(arr!=null){
     val parsed=buildList{for(i in 0 until arr.length()){val p=arr.optJSONObject(i)?:continue;val price=p.optInt("sellingPrice",p.optInt("price",0));val name=p.optString("name",p.optString("productName"));val category=p.optString("category","Accessories");if(price in 1..500&&name.isNotBlank()&&isAccessory(category))add(Product(p.optString("id",p.optString("productId")),name,category,price,p.optInt("mrp",price),p.optDouble("rating",0.0),p.optInt("stock",-1),p.optString("image",p.optString("imageUrl","")),p.optString("details","")))}}
     if(parsed.isNotEmpty())return parsed
    }
   }catch(_:Exception){ /* Try the public CSV source below. */ }
  }
  val csv=fetchText("/products.csv")?:return emptyList()
  val lines=csv.lineSequence().filter{it.isNotBlank()}.toList()
  if(lines.size<2)return emptyList()
  val headers=parseCsvLine(lines.first()).map{it.trim().lowercase()}
  fun field(row:List<String>,vararg names:String):String {val i=headers.indexOfFirst{it in names};return if(i>=0)row.getOrElse(i){""}.trim() else ""}
  return buildList {
   for(line in lines.drop(1)){
    val row=parseCsvLine(line);val name=field(row,"product name","name");val category=field(row,"category")
    val price=field(row,"selling price","sellingprice","price").toIntOrNull()?:0
    val mrp=field(row,"mrp").toIntOrNull()?:price
    if(name.isBlank()||price !in 1..500||!isAccessory(category))continue
    val id=field(row,"product id","productid","id").ifBlank{name.lowercase().replace(Regex("[^a-z0-9]+"),"-")}
    val stock=field(row,"stock").toIntOrNull()?:-1
    val rating=field(row,"rating").toDoubleOrNull()?:0.0
    val image=field(row,"image","image url","imageurl")
    val details=field(row,"details","description")
    add(Product(id,name,category,price,mrp,rating,stock,image,details))
   }
  }
 }
 private fun fetchText(path:String):String?{
  val c=URL(BuildConfig.API_BASE_URL+path).openConnection() as HttpURLConnection
  c.connectTimeout=6000;c.readTimeout=6000
  return try{if(c.responseCode !in 200..299)null else c.inputStream.bufferedReader().use{it.readText()}}catch(_:Exception){null}finally{c.disconnect()}
 }
 private fun isAccessory(category:String):Boolean{
  // Juno is an accessories-only shop: use an allow-list so clothing, footwear,
  // bags and unknown categories never leak into the mobile catalogue.
  val allowed=setOf("hair clips","claw clips","hair bands","scrunchies","earrings","necklaces","bracelets","bangles","rings","sunglasses","watches","phone cases","keychains","caps","scarves","belts")
  return category.trim().lowercase() in allowed
 }
 private fun parseCsvLine(line:String):List<String>{
  val out=mutableListOf<String>();val cell=StringBuilder();var quoted=false;var i=0
  while(i<line.length){val ch=line[i];if(ch=='"'){if(quoted&&i+1<line.length&&line[i+1]=='"'){cell.append('"');i++}else quoted=!quoted}else if(ch==','&&!quoted){out.add(cell.toString());cell.setLength(0)}else cell.append(ch);i++}
  out.add(cell.toString());return out
 }
 val filtered get()=products.filter{it.price in 1..500&&(category=="All"||it.category==category)&&(search.isBlank()||"${it.name} ${it.category} ${it.details}".contains(search,true))}
 fun wish(p:Product){wishlist=if(p.id in wishlist)wishlist-p.id else wishlist+p.id;saveWishlist()}
 fun add(p:Product){val current=cart[p.id]?:0;if(p.stock>=0&&current>=p.stock)return;cart=cart+(p.id to (current+1));saveCart()}
 fun persistCart(){saveCart()}
 fun total()=products.sumOf{it.price*(cart[it.id]?:0)}
}
class MainActivity:ComponentActivity(),PaymentResultWithDataListener{
 private var shopModel:ShopModel?=null
 override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);Checkout.preload(applicationContext);setContent{MaterialTheme(colorScheme=lightColorScheme(primary=Pink)){val vm:ShopModel=viewModel();shopModel=vm;JunoApp(vm)}}}
 override fun onPaymentSuccess(razorpayPaymentId:String?,paymentData:PaymentData?){val data=paymentData;if(data!=null)shopModel?.onPaymentSuccess(data) else shopModel?.onPaymentError(0,"Payment confirmation was incomplete.")}
 override fun onPaymentError(code:Int,description:String?,paymentData:PaymentData?){shopModel?.onPaymentError(code,description)}
}
@Composable fun JunoApp(vm:ShopModel=viewModel()){
 Scaffold(bottomBar={NavigationBar(containerColor=Color.White){listOf("Home","Wishlist","Cart","Account").forEach{label->val icon=when(label){"Home"->Icons.Default.Home;"Wishlist"->Icons.Default.Favorite;"Cart"->Icons.Default.ShoppingBag;else->Icons.Default.Person};NavigationBarItem(selected=vm.tab==label,onClick={vm.tab=label;vm.selected=null},icon={Icon(icon,null)},label={Text(label)})}}}){pad->
 Column(Modifier.fillMaxSize().padding(pad).background(Color.White)){
 if(vm.selected!=null) Detail(vm,vm.selected!!){vm.selected=null} else when(vm.tab){
 "Wishlist"->Listing(vm,vm.products.filter{it.id in vm.wishlist},"Your wishlist")
 "Cart"->Cart(vm)
 "Account"->AccountScreen(vm)
 else->Home(vm)
 }
 }
 }
}
@Composable fun AccountScreen(vm:ShopModel){
 var email by remember { mutableStateOf(vm.accountEmail) }
 var password by remember { mutableStateOf("") }
 var name by remember { mutableStateOf("") }
 var creating by remember { mutableStateOf(false) }
 Column(Modifier.fillMaxSize().padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
  Text("Your Juno account",fontSize=25.sp,fontWeight=FontWeight.Bold)
  if(vm.authToken.isNotBlank()){
   Text("Signed in",color=Color(0xFF16834A),fontWeight=FontWeight.Bold)
   Text(vm.accountName.ifBlank{"Juno customer"},fontSize=20.sp,fontWeight=FontWeight.SemiBold)
   Text(vm.accountEmail,color=Color.Gray)
   Text("Use sign out on shared devices.",fontSize=12.sp,color=Color.Gray)
   OutlinedButton(onClick={vm.loadOrders()},enabled=!vm.ordersBusy,modifier=Modifier.fillMaxWidth()){Text(if(vm.ordersBusy)"Loading orders…" else "View my orders")}
   if(vm.ordersMessage.isNotBlank())Text(vm.ordersMessage,fontSize=13.sp,color=Color.Gray)
   vm.orders.forEach { order ->
    Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(12.dp)){Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(4.dp)){
     Text("Order "+order.optString("id"),fontWeight=FontWeight.Bold,color=Pink)
     Text("Date: "+order.optString("date","—"),fontSize=13.sp)
     Text("Status: "+order.optString("status","New"),fontWeight=FontWeight.SemiBold)
     Text("Total: ₹"+order.optInt("total"),fontSize=14.sp)
     if(order.optString("tracking").isNotBlank())Text("Tracking: "+order.optString("tracking"),fontSize=12.sp)
    }}
   }
   Button(onClick={vm.logout()},modifier=Modifier.fillMaxWidth()){Text("Sign out")}
  }else{
   Text(if(creating)"Create your Juno account" else "Sign in with your Juno account",color=Color.Gray)
   if(creating)OutlinedTextField(value=name,onValueChange={name=it},label={Text("Name")},singleLine=true,modifier=Modifier.fillMaxWidth())
   OutlinedTextField(value=email,onValueChange={email=it},label={Text("Email")},singleLine=true,modifier=Modifier.fillMaxWidth())
   OutlinedTextField(value=password,onValueChange={password=it},label={Text("Password (minimum 8 characters)")},singleLine=true,modifier=Modifier.fillMaxWidth())
   Button(onClick={if(creating)vm.signup(name,email,password) else vm.login(email,password)},enabled=!vm.authBusy,modifier=Modifier.fillMaxWidth()){Text(if(vm.authBusy)"Please wait…" else if(creating)"Create account" else "Sign in")}
   TextButton(onClick={creating=!creating;vm.authMessage=""}){Text(if(creating)"Already have an account? Sign in" else "New to Juno? Create account")}
   if(!creating)TextButton(onClick={vm.requestPasswordReset(email)},enabled=!vm.authBusy){Text("Forgot password?")}
   Text("Accounts use the shared Juno API. Keep your password private.",fontSize=12.sp,color=Color.Gray)
  }
  if(vm.authMessage.isNotBlank())Text(vm.authMessage,color=if(vm.authMessage.contains("successfully"))Color(0xFF16834A) else Color.Gray)
 }
}
@Composable fun Header(vm:ShopModel){Column(Modifier.fillMaxWidth().background(SoftPink).padding(16.dp)){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Column{Text("JUNO",fontSize=27.sp,fontWeight=FontWeight.Black,color=Pink,letterSpacing=1.sp);Text("Little finds. Lovely prices.",fontSize=11.sp)};Text("Under ₹500",color=Pink,fontWeight=FontWeight.Bold)};Spacer(Modifier.height(10.dp));OutlinedTextField(vm.search,{vm.search=it},Modifier.fillMaxWidth(),singleLine=true,placeholder={Text("Search clips, scrunchies, hoops…")},leadingIcon={Icon(Icons.Default.Search,null)})}}
@Composable fun Home(vm:ShopModel){Header(vm);Column{Text("Shop by category",fontSize=18.sp,fontWeight=FontWeight.Bold,modifier=Modifier.padding(start=14.dp,top=12.dp));Row(Modifier.fillMaxWidth().padding(horizontal=8.dp),horizontalArrangement=Arrangement.spacedBy(4.dp)){(listOf("All")+vm.products.map{it.category}.distinct().take(4)).forEach{FilterChip(vm.category==it,{vm.category=it},{Text(it,maxLines=1,overflow=TextOverflow.Ellipsis)})}};Row(Modifier.fillMaxWidth().padding(horizontal=14.dp),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text("Trending accessories",fontSize=20.sp,fontWeight=FontWeight.ExtraBold);TextButton(onClick={vm.refresh()}){Text("Refresh")}};if(vm.loading)LinearProgressIndicator(Modifier.fillMaxWidth());if(vm.notice.isNotBlank())Text(vm.notice,Modifier.padding(horizontal=14.dp),fontSize=11.sp,color=Color.Gray)
 LazyVerticalGrid(GridCells.Fixed(2),contentPadding=PaddingValues(10.dp),horizontalArrangement=Arrangement.spacedBy(9.dp),verticalArrangement=Arrangement.spacedBy(9.dp)){items(vm.filtered){p->CardProduct(p,p.id in vm.wishlist,{vm.selected=p},{vm.wish(p)},{vm.add(p)})}}
}}
@Composable fun CardProduct(p:Product,wished:Boolean,open:()->Unit,wish:()->Unit,add:()->Unit){Card(modifier=Modifier.fillMaxWidth().clickable{open()},shape=RoundedCornerShape(14.dp)){Column{Box(Modifier.fillMaxWidth().height(135.dp).background(SoftPink),contentAlignment=Alignment.Center){if(p.image.isNotBlank())AsyncImage(p.image,p.name,Modifier.fillMaxSize())else Text("✦",fontSize=48.sp,color=Pink);IconButton(onClick=wish,modifier=Modifier.align(Alignment.TopEnd)){Icon(if(wished)Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,null,tint=Pink)}};Column(Modifier.padding(9.dp)){Text(p.name,minLines=2,maxLines=2,overflow=TextOverflow.Ellipsis,fontWeight=FontWeight.SemiBold);Row(verticalAlignment=Alignment.CenterVertically){Text("₹${p.price}",fontWeight=FontWeight.ExtraBold,fontSize=17.sp);if(p.discount>0)Text(" ${p.discount}% off",fontSize=10.sp,color=Color(0xFF16834A))};Text("★ ${p.rating} · ${p.category}",fontSize=10.sp,color=Color.Gray);Button(onClick=add,modifier=Modifier.fillMaxWidth()){Text("Add to bag")}}}}}
@Composable fun Detail(vm:ShopModel,p:Product,back:()->Unit){Column(Modifier.fillMaxSize().padding(16.dp)){TextButton(onClick=back){Text("← Back")};if(p.image.isNotBlank())AsyncImage(p.image,p.name,Modifier.fillMaxWidth().height(260.dp))else Box(Modifier.fillMaxWidth().height(220.dp).background(SoftPink),contentAlignment=Alignment.Center){Text("✦",fontSize=70.sp,color=Pink)};Text(p.name,fontSize=26.sp,fontWeight=FontWeight.ExtraBold);Text(p.details.ifBlank{p.category},color=Color.Gray);Text("₹${p.price}   ₹${p.mrp}   ${p.discount}% off",fontSize=21.sp,fontWeight=FontWeight.Bold);Text("★ ${p.rating} · stock ${if(p.stock<0)"to be confirmed" else p.stock}",fontSize=12.sp);Text("Delivery estimate and PIN-code availability must be confirmed with the live service.",fontSize=12.sp,color=Color.Gray);Button(onClick={vm.add(p);back()},enabled=p.stock!=0,modifier=Modifier.fillMaxWidth()){Text("Add to bag")};OutlinedButton(onClick={vm.wish(p)},modifier=Modifier.fillMaxWidth()){Text(if(p.id in vm.wishlist)"Saved to wishlist" else "Add to wishlist")}}}
@Composable fun Listing(vm:ShopModel,ps:List<Product>,title:String){Column{Text(title,fontSize=25.sp,fontWeight=FontWeight.Bold,modifier=Modifier.padding(16.dp));LazyVerticalGrid(GridCells.Fixed(2),contentPadding=PaddingValues(10.dp)){items(ps){p->CardProduct(p,p.id in vm.wishlist,{vm.selected=p},{vm.wish(p)},{vm.add(p)})}}}}
@Composable fun Cart(vm:ShopModel){
 val context=androidx.compose.ui.platform.LocalContext.current
 val activity=context as? Activity
 val ps=vm.products.filter{(vm.cart[it.id]?:0)>0}
 Column(Modifier.fillMaxSize().padding(16.dp)){
  Text("Your bag",fontSize=26.sp,fontWeight=FontWeight.Bold)
  if(ps.isEmpty())Text("Your bag is empty.",Modifier.padding(top=16.dp))
  ps.forEach{p->Row(Modifier.fillMaxWidth().padding(vertical=8.dp),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){
   Column(Modifier.weight(1f)){Text(p.name,fontWeight=FontWeight.SemiBold);Text("${vm.cart[p.id]} × ₹${p.price}",color=Color.Gray)}
   Text("₹${p.price*(vm.cart[p.id]?:0)}")
   TextButton(onClick={vm.cart=vm.cart-p.id;vm.persistCart()}){Text("Remove")}
  }}
  Text("Subtotal: ₹${vm.total()}",fontSize=20.sp,fontWeight=FontWeight.Bold)
  Text("Delivery is ₹39 below ₹299 after discounts. Tamil Nadu PIN codes only.",fontSize=12.sp,color=Color.Gray)
  OutlinedTextField(value=vm.addressName,onValueChange={vm.addressName=it},label={Text("Recipient name")},singleLine=true,modifier=Modifier.fillMaxWidth())
  OutlinedTextField(value=vm.addressPhone,onValueChange={vm.addressPhone=it.filter(Char::isDigit).take(10)},label={Text("Mobile number")},singleLine=true,modifier=Modifier.fillMaxWidth())
  OutlinedTextField(value=vm.addressLine,onValueChange={vm.addressLine=it},label={Text("Full delivery address")},modifier=Modifier.fillMaxWidth(),minLines=2)
  OutlinedTextField(value=vm.addressPin,onValueChange={vm.addressPin=it.filter(Char::isDigit).take(6)},label={Text("Tamil Nadu PIN code")},singleLine=true,modifier=Modifier.fillMaxWidth())
  OutlinedTextField(value=vm.coupon,onValueChange={vm.coupon=it},label={Text("Coupon code (optional)")},singleLine=true,modifier=Modifier.fillMaxWidth())
  Text("Secure online payment via Razorpay (UPI / cards / netbanking). COD is unavailable.",fontSize=12.sp,color=Color.Gray)
  Button(onClick={if(activity!=null)vm.startCheckout(activity) else vm.checkoutMessage="Unable to open payment from this screen."},enabled=ps.isNotEmpty()&&!vm.checkoutBusy,modifier=Modifier.fillMaxWidth()){Text(if(vm.checkoutBusy)"Please wait…" else "Continue to secure payment")}
  if(vm.checkoutMessage.isNotBlank())Text(vm.checkoutMessage,fontSize=13.sp,color=if(vm.checkoutMessage.contains("verified"))Color(0xFF16834A) else Color.Gray)
 }}
