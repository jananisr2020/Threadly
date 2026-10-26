# Juno iOS app

SwiftUI iOS starter for Juno. The first implementation uses a native SwiftUI shell around the existing Juno storefront so catalogue and web updates stay aligned while native commerce APIs are completed.

## Open and run
1. Install Xcode on macOS.
2. Install XcodeGen with Homebrew: brew install xcodegen.
3. From this folder run xcodegen generate, then open Juno.xcodeproj.
4. Select a simulator or a real iPhone and run.

## Current scope and honest limitations
- Uses WKWebView to load https://threadly-fashion.netlify.app/; this is a web-backed app shell, not a fully native commerce app yet.
- Provides loading behavior from WKWebView and a reload button.
- No App Store listing, Apple Developer signing, privacy disclosures, or release archive is created by this source alone.
- Before submission, verify storefront mobile usability, authentication/payment policy compliance, account deletion/privacy flows, offline behavior, and App Review requirements. Apple may reject a thin website wrapper; add meaningful native value before submission.
- Google Play and Apple App Store links on the website must remain coming soon until approved and published.

## Build validation
GitHub Actions uses macOS and XcodeGen to generate the Xcode project and compile for the iOS Simulator. A successful simulator build does not mean the app is signed or ready for App Store submission.
