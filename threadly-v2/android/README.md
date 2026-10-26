# Juno Android app

Native Android starter project for the Juno accessories marketplace. Kotlin + Jetpack Compose; it consumes the existing website API and keeps product prices at or below ₹500.

## Open and run
1. Open the `android/` directory in Android Studio (Hedgehog or newer).
2. Install JDK 17 and Android SDK Platform 35.
3. Allow Gradle sync to finish.
4. Run the `app` configuration on an emulator or Android device.

## Backend contract
The app currently expects `GET https://threadly-fashion.netlify.app/api/products` to return JSON shaped like:
```json
{ "products": [{ "id": "JN0001", "name": "Pastel Hair Clip", "category": "Hair Clips", "price": 45, "mrp": 90, "image": "https://...", "stock": 5, "rating": 4.5, "details": "Metal & acrylic" }] }
```
The existing repository's API response shape must be checked and adapted before release. The CSV fallback and schema adapter are not yet wired into this first native client.

## Current implementation
- Native Compose storefront, product search, category chips, budget cap, wishlist and bag state for the current app session.
- Product detail dialog and remote product images.
- Network errors are surfaced instead of pretending checkout succeeded.

## Before Play Store release
- Verify/implement the catalogue endpoint and response schema.
- Persist account, wishlist and cart against the shared backend.
- Integrate authenticated account, seller onboarding, order history, reviews and similar products.
- Integrate Razorpay's approved Android checkout flow; do not collect card data directly.
- Configure production package name, signing key, app icon/screenshots, privacy policy, data-safety disclosures, content rating and target SDK requirements.
- Add automated unit/UI tests and build a signed Android App Bundle (`.aab`).
- Test installation, navigation, accessibility, slow/offline networks, payment success/failure and order confirmation on real devices.
