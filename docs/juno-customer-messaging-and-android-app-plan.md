# Juno customer messaging and Android app plan

## Product tone

Juno messages should be concise, useful, and polished. Use a neutral, friendly tone. Avoid excessive hearts, pet names, repeated emojis, false urgency, or guilt-based copy. A small, occasional sparkle or smile is fine where it fits the brand.

## Goals

1. Verify customer identity with OTP.
2. Send reliable order and delivery messages.
3. Recover eligible abandoned carts with relevant product links.
4. Recommend accessories using real browsing, cart, and purchase signals.
5. Deliver opt-in push notifications through a published Android app.
6. Keep website and app on the same catalogue, customer identity, orders, and payment backend.

## Phase 1 — Transactional email and OTP

Use the existing Netlify Functions backend and Google Sheets setup initially.

- Check and reuse the configured Brevo integration (`BREVO_API_KEY`, `MAIL_FROM`) for transactional email.
- Verify the sender domain/address before production sending.
- Add a provider abstraction so email and SMS implementations can be changed without rewriting order logic.
- Generate OTPs server-side using a cryptographically secure random generator. Store only a hash, expiry, attempt count, purpose, and destination reference; never log or store the plaintext OTP in activity logs.
- Expire OTPs quickly, enforce resend and verification rate limits, and invalidate after successful use.
- Do not treat a client-supplied email or phone number as verified until OTP validation succeeds.
- Support email OTP first if provider and sender configuration are ready; add SMS OTP once the SMS provider and Indian messaging requirements are configured.

## Phase 2 — Order and delivery notifications

Send messages only from server-verified state changes, never from an untrusted browser success screen.

| Event | Message contents | Channel |
|---|---|---|
| OTP requested | Code, expiry, security reminder | Chosen OTP channel |
| Payment verified and order recorded | Order number, actual items/quantities, total, payment status, order link | Email; optional transactional SMS |
| Order confirmed / packed | Order number and current status | Email; optional SMS |
| Shipped | Courier and tracking link when available | Email and optional SMS |
| Delivered | Delivery confirmation and help link | Email |
| Cancelled/refunded | Confirmed status and amount/details when verified | Email; SMS where appropriate |

Requirements:
- Use real order data from the backend/Google Sheet.
- Use an idempotency key per order/event/channel so retries do not send duplicate messages.
- Record provider message ID, status, attempt count, and timestamps in a `NotificationLog` tab.
- A provider outage must not undo a paid order or block checkout; failed messages should be retried safely.
- Never send card details, payment secrets, authentication tokens, or OTPs in order notifications.
- Keep cash on delivery disabled.

## Phase 3 — Customer activity and cart recovery

Record a small, privacy-conscious set of events: product viewed, search submitted, item added/removed from cart, checkout started, purchase completed, and notification preferences changed.

- Use a random session ID for guest browsing; associate events with a customer only after sign-in and appropriate consent.
- Do not collect keystrokes, passwords, payment form data, or unrelated device activity.
- Treat leaving a page as uncertain. Use a cart that remains unpurchased after a delay, not an assumption that the customer has definitely left.
- Proposed initial delay: 2 hours after cart inactivity. Before sending, re-check that the cart is not empty and no matching order has completed.
- Start with one reminder per abandoned cart, with a frequency cap. Do not use guilt or fake scarcity.
- Include the actual products, prices, stock state, and a direct return-to-cart link.
- Send marketing recommendations only to customers who have opted in. Transactional order messages are kept separate from promotional messages.
- Provide unsubscribe/opt-out and preference controls; respect them across providers.

### Recommendation ranking for the first release

1. Products in the same category as recently viewed/cart items.
2. Matching or complementary accessories from the current catalogue.
3. Products previously viewed but not purchased, if still in stock.
4. Popular products based on real order data, once enough data exists.

Filter unavailable products and enforce Juno's current price rules. Do not invent stock, discounts, reviews, or urgency.

## Phase 4 — Android app and Play Store

### Current starting point

The repository already documents an Android shell under `threadly-android/` using Capacitor and a GitHub Actions APK build. The first milestone is to inspect and validate this existing shell rather than start a second, disconnected app. It currently loads the deployed Juno website, so the website/backend remain the source of truth.

### Recommended implementation

1. **App identity:** set the final Juno application ID/package name, app name, icon, splash screen, versioning, and production HTTPS site URL.
2. **Native build:** install/validate the Capacitor Android project, build a debug APK for device testing, then generate a signed Android App Bundle (AAB) for Play Console.
3. **Push notifications:** use Firebase Cloud Messaging (FCM) with a maintained Capacitor push-notifications plugin. Create a Firebase Android app matching the exact package name.
4. **Device registration:** after permission is granted, send the FCM token to an authenticated Netlify endpoint. Store user ID, token, platform, created/last-seen timestamps, and active status. Handle token rotation and logout/device removal.
5. **Server-triggered pushes:** send notifications only after trusted backend events, such as verified payment, shipment, delivery, or opted-in cart/recommendation campaigns. Use the same event IDs and deduplication rules as email/SMS.
6. **Deep links:** tapping a notification should open the relevant Juno order, tracking page, cart, or product inside the app. Require authentication before exposing private order details.
7. **Permission UX:** explain the benefit before requesting notification permission; do not block browsing or checkout if permission is denied.
8. **QA:** test fresh install, login/logout, permission denied/allowed, token refresh, duplicate delivery, app killed/background/foreground, deep links, Android versions, slow network, and notification opt-out.
9. **Play Store release:** prepare Play Console account, signed AAB, store listing/screenshots, privacy policy, Data safety declarations, app access instructions, content rating, and any testing-track requirements currently shown by Play Console. Complete internal testing before production rollout.

### Notification categories in the app

- **Orders and delivery:** operational notifications tied to a real order.
- **Offers and recommendations:** optional promotional notifications controlled by user preference.
- **Account/security:** OTP and important account-security messages; never send the OTP in a push notification.

Let customers manage promotional push preferences independently of essential order updates. Do not send every product view as a push notification.

## Phase 5 — Data model additions

For the initial Sheets-backed implementation, add tabs with stable headers and automatic tab setup where supported:

### NotificationPreferences

`User ID, Email, Phone, Email Verified, Phone Verified, Transactional Email, Transactional SMS, Marketing Email, Marketing SMS, Push Enabled, Updated`

Store explicit consent source/time and opt-out time as well. Do not assume marketing consent from account creation.

### NotificationLog

`Event ID, Created, User ID, Order ID, Channel, Template, Destination Masked, Provider Message ID, Status, Attempts, Last Attempt, Error Code`

Do not put OTP values or full sensitive message payloads in this log.

### DeviceTokens

`Token ID, User ID, Platform, FCM Token, Active, Created, Last Seen, Updated`

Restrict token access to backend/admin processes. Never publish tokens in the product catalogue or client-readable public data.

### ActivityEvents

`Event ID, Timestamp, Session ID, User ID, Event Type, Product ID, Category, Cart ID, Consent State`

Keep payloads minimal. Define retention and deletion behaviour before collecting large-scale clickstream data.

Google Sheets can support an early test but is not a robust high-volume event queue. Before scaling automated campaigns, move activity events, notification jobs, device tokens, and idempotency keys to a proper database/queue. Do not make checkout depend on marketing writes.

## Environment configuration to plan for

- Existing: `BREVO_API_KEY`, `MAIL_FROM`, Google Sheets credentials, `JWT_SECRET`.
- To add after provider setup: SMS provider credentials and sender/template identifiers.
- To add for push: Firebase service credentials stored only as server-side secrets (or a securely configured provider integration); never put a server credential in frontend JavaScript.
- Keep test and production provider credentials separate. Never commit secrets to Git.

## Release sequence and acceptance criteria

- [ ] Inspect current auth, payment-confirmation, webhook, order-status, Android shell, and environment setup before editing implementation.
- [ ] Email OTP works with expiry, one-time use, rate limiting, and no plaintext OTP logging.
- [ ] Failed email/SMS delivery does not corrupt login or paid-order state.
- [ ] A verified payment produces one order confirmation per channel, even if the webhook retries.
- [ ] Shipping/delivery messages use the real status and tracking data.
- [ ] Marketing messages require explicit opt-in and respect unsubscribe/frequency caps.
- [ ] Abandoned-cart reminder is suppressed after purchase, cart removal, or opt-out.
- [ ] Android app shares the live backend/catalogue and supports FCM push and deep links.
- [ ] Push is opt-in, nonessential permission denial does not block shopping, and token rotation/logout are handled.
- [ ] Debug APK tested on a real Android device; signed AAB tested through Play Console internal track.
- [ ] Netlify deploy and provider credentials are verified in the actual production environment before calling the feature live.

## Scope and status

This document is the implementation plan only. It does not itself configure provider accounts, send messages, create a Firebase project, publish an app, or change the live site. Provider credentials, sender verification, Firebase setup, device testing, and Play Console release steps are required before production use.
