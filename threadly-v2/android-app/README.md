# Juno Android app

Native Android starter for Juno accessories, written in Kotlin and Jetpack Compose.

## Open
Open this folder in Android Studio, use JDK 17, install Android SDK Platform 35, then sync Gradle and run the app.

## Important before production
- API base URL is in app/build.gradle.kts.
- The app tries GET /catalog.json and expects a JSON object with a products array. Accepted fields include id/productId, name/productName, category, sellingPrice/price, mrp, rating, stock, image/imageUrl, details.
- The repository source catalogue is currently public/products.csv. Confirm the deployed catalog.json schema and map it correctly before relying on live prices or stock. Sample items are fallback only.
- Cart and wishlist are currently in-memory; they do not sync to a user account or persist after process death.
- Checkout, authentication, OTP, order history, reviews, seller onboarding, and personalized recommendations require verified shared backend endpoints. They are not falsely marked complete here.
- COD is not offered. Do not simulate a payment. Integrate Razorpay only after server-side order creation and payment signature verification are implemented and tested.
- Before publishing: run builds/tests, configure app signing securely, add privacy policy and data safety disclosures, test on real devices, and upload a signed Android App Bundle (.aab) through Play Console.
