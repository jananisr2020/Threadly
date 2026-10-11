# Threadly Android app

This folder builds an installable Android app package for Threadly.

## How it works
- App name: Threadly
- Android application ID: `com.threadlyfashion.app`
- Uses the existing live Threadly storefront at https://threadly-fashion.netlify.app so current catalogue, login, order APIs and Razorpay website checkout continue using the existing HTTPS origin.
- Capacitor provides the Android application shell. This first build is an MVP wrapper; it is not yet a fully native shopping UI.

## Build a test APK
1. Open the repository's **Actions** tab on GitHub.
2. Choose **Build Threadly Android APK**.
3. Select **Run workflow** on the `feat/threadly-android-app` branch (or merge this branch and run on `main`).
4. Download the `threadly-debug-apk` artifact from the completed workflow.
5. Install the APK on an Android test phone. Android may ask you to allow installs from the browser/file manager.

## Google Play Store release
A debug APK is for testing, not publishing. Before a Play Store release:
1. Create/verify the Google Play Console developer account and app listing.
2. Create a production signing key and keep it private. Never commit the keystore or passwords to GitHub.
3. Configure a signed Android App Bundle (AAB) build with GitHub Actions secrets.
4. Add a public privacy policy and complete Google Play's Data safety, content rating, target API and testing requirements.
5. Test checkout, sign-in, external links, Android back navigation and order status on real devices.
6. Review Google Play's functionality and minimum-functionality policy: a thin website wrapper may not be accepted as a standalone app. Add meaningful app-specific features and native integration before release.

## Important
The app uses the live website URL to keep the existing API endpoints on the correct domain. Changes to the live website therefore appear in the app without rebuilding. This is a practical first Android MVP, not a claim that the Play Store submission is complete.
