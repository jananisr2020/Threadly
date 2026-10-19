# Juno / Threadly — Project Change Report

- Repository: [jananisr2020/Threadly](https://github.com/jananisr2020/Threadly)
- Branch tracked: main (history read from main)
- Last generated: 2026-10-19 21:49:53 IST
- Commits covered: 176
- Date range: 11 Oct 2026 19:12 IST to 19 Oct 2026 21:49 IST
- Spreadsheet log: [Open project-tracker.csv](./project-tracker.csv)

## Automatic updates

A GitHub Actions workflow refreshes this report and CSV on pushes to main, excluding tracker-only changes, and supports manual runs from the Actions tab. It commits the regenerated files only when the content changes.

## How to read each entry

Every entry includes a short plain-English explanation, the commit time in India time, a link to the exact code change, file count and line changes. The CSV includes UTC and IST timestamps and all changed paths.

A commit does not prove tests passed or the change reached the live website. Those statuses are not guessed; check the CI run and Netlify deployment separately.

## Timeline — India Standard Time

### Sunday, 11 October 2026

#### 19:12:37 IST — [Initial commit](https://github.com/jananisr2020/Threadly/commit/fdabc064aa0df668e2a71ec4fa5d2f4817f0cc15)

Project maintenance: Initial commit. This changed 1 file(s): README.md.

- Commit: fdabc06 | Files changed: 1 | Lines: +1 / -0
- Changed files: README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:25:19 IST — [Initial Threadly project upload](https://github.com/jananisr2020/Threadly/commit/43b75fa4852aeccff6d99e4453594615cedd0d52)

Branding and app identity: Initial Threadly project upload. This changed 46 file(s): threadly-v2/.env.example, threadly-v2/.gitignore, threadly-v2/README.md, threadly-v2/Threadly_Database.xlsx, and 42 more file(s).

- Commit: 43b75fa | Files changed: 46 | Lines: +1725 / -0
- Changed files: threadly-v2/.env.example, threadly-v2/.gitignore, threadly-v2/README.md, threadly-v2/Threadly_Database.xlsx, threadly-v2/netlify.toml, threadly-v2/netlify/functions/add-review.js, plus 40 more
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:29:41 IST — [Update Threadly with latest local code](https://github.com/jananisr2020/Threadly/commit/4e25f27d438d0da99fd56eb024191b88e048ed8c)

Branding and app identity: Update Threadly with latest local code. This changed 1 file(s): threadly-v2/package-lock.json.

- Commit: 4e25f27 | Files changed: 1 | Lines: +702 / -0
- Changed files: threadly-v2/package-lock.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:40:58 IST — [Add installable Threadly PWA support](https://github.com/jananisr2020/Threadly/commit/7f060bf273867c02c9d71e2794007530189d0741)

Installable web app: Add installable Threadly PWA support. * Add Threadly PWA service worker * Add Threadly offline fallback page * Register Threadly PWA and add install prompt * Complete Threadly installable PWA manifest Files: threadly-v2/public/index.html, threadly-v2/public/manifest.webmanifest, threadly-v2/public/offline.html, threadly-v2/public/sw.js.

- Commit: 7f060bf | Files changed: 4 | Lines: +171 / -1
- Changed files: threadly-v2/public/index.html, threadly-v2/public/manifest.webmanifest, threadly-v2/public/offline.html, threadly-v2/public/sw.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:48:22 IST — [Add Threadly Android app project](https://github.com/jananisr2020/Threadly/commit/d2fdea99555b953d9cc7f6a99f555aa040829bcd)

Android app: Add Threadly Android app project. * Add Threadly Android app project * Configure Threadly Android app * Document Threadly Android build and Play Store steps * Add GitHub Actions workflow to build Threadly Android APK * Fix Android workflow dependency set… Files: .github/workflows/build-threadly-android.yml, threadly-android/README.md, threadly-android/capacitor.config.json, threadly-android/package.json.

- Commit: d2fdea9 | Files changed: 4 | Lines: +119 / -0
- Changed files: .github/workflows/build-threadly-android.yml, threadly-android/README.md, threadly-android/capacitor.config.json, threadly-android/package.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:23:52 IST — [Add SEO foundations for Threadly](https://github.com/jananisr2020/Threadly/commit/54caa13d87cc9ec3f9a3c504081da6224f32d279)

Search visibility: Add SEO foundations for Threadly. Improve homepage search metadata and add robots.txt and XML sitemap. Files: threadly-v2/public/index.html, threadly-v2/public/robots.txt, threadly-v2/public/sitemap.xml.

- Commit: 54caa13 | Files changed: 3 | Lines: +22 / -4
- Changed files: threadly-v2/public/index.html, threadly-v2/public/robots.txt, threadly-v2/public/sitemap.xml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:25:03 IST — [Improve product-page SEO metadata](https://github.com/jananisr2020/Threadly/commit/3a46364930a2591b03b7a1c4f58bfd589b6aafd9)

Search visibility: Improve product-page SEO metadata. Set product-specific metadata and use Netlify SEO function for sitemap and robots. Files: threadly-v2/public/index.html, threadly-v2/public/robots.txt, threadly-v2/public/sitemap.xml.

- Commit: 3a46364 | Files changed: 3 | Lines: +18 / -15
- Changed files: threadly-v2/public/index.html, threadly-v2/public/robots.txt, threadly-v2/public/sitemap.xml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:33:07 IST — [Show persistent Threadly app install CTA](https://github.com/jananisr2020/Threadly/commit/d6c11f520f5ec4324fdf92f612c2bd9bcf78ea23)

Branding and app identity: Show persistent Threadly app install CTA. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: d6c11f5 | Files changed: 1 | Lines: +13 / -4
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:48:59 IST — [Use existing Threadly logo for Android launcher icon](https://github.com/jananisr2020/Threadly/commit/56d93a0e299333c35c2ba5c9cb583ab8e8905183)

Android app: Use existing Threadly logo for Android launcher icon. This changed 1 file(s): .github/workflows/build-threadly-android.yml.

- Commit: 56d93a0 | Files changed: 1 | Lines: +7 / -0
- Changed files: .github/workflows/build-threadly-android.yml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:54:24 IST — [Fix Threadly browser tab favicon cache](https://github.com/jananisr2020/Threadly/commit/a13159507e5e7ba25d1bb02220d9971d3919e9be)

Branding and app identity: Fix Threadly browser tab favicon cache. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: a131595 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:58:27 IST — [Rebrand storefront as Juno and update brand mark](https://github.com/jananisr2020/Threadly/commit/d13e912abf47d8bb1a640424cf2ea880046a96ae)

Branding and app identity: Rebrand storefront as Juno and update brand mark. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: d13e912 | Files changed: 1 | Lines: +23 / -23
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:58:30 IST — [Replace browser favicon with Juno J mark](https://github.com/jananisr2020/Threadly/commit/fb82f5b32c43104bd3eef149245bcd6b25bc6b77)

Branding and app identity: Replace browser favicon with Juno J mark. This changed 1 file(s): threadly-v2/public/favicon.svg.

- Commit: fb82f5b | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/favicon.svg
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:58:34 IST — [Update Juno installable web app branding](https://github.com/jananisr2020/Threadly/commit/cd9a0fc40b87f1d9b505bcdc59b3e197a8e5b224)

Branding and app identity: Update Juno installable web app branding. This changed 1 file(s): threadly-v2/public/manifest.webmanifest.

- Commit: cd9a0fc | Files changed: 1 | Lines: +5 / -11
- Changed files: threadly-v2/public/manifest.webmanifest
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:58:37 IST — [Rebrand admin interface as Juno](https://github.com/jananisr2020/Threadly/commit/8d378ec5505a4ab934b4e4dc2688f17ed057af87)

Branding and app identity: Rebrand admin interface as Juno. This changed 1 file(s): threadly-v2/public/admin.html.

- Commit: 8d378ec | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/admin.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:58:48 IST — [Rebrand Juno storefront policy pages](https://github.com/jananisr2020/Threadly/commit/f9ebdde487305a01bea0fff09280603aa7c8a190)

Branding and app identity: Rebrand Juno storefront policy pages. This changed 1 file(s): threadly-v2/public/contact.html.

- Commit: f9ebdde | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/contact.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:58:52 IST — [Rebrand Juno storefront policy pages](https://github.com/jananisr2020/Threadly/commit/3de42db600d075838457c1900c5fda90bff0915c)

Branding and app identity: Rebrand Juno storefront policy pages. This changed 1 file(s): threadly-v2/public/terms.html.

- Commit: 3de42db | Files changed: 1 | Lines: +4 / -4
- Changed files: threadly-v2/public/terms.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:58:57 IST — [Rebrand Juno storefront policy pages](https://github.com/jananisr2020/Threadly/commit/6aba43fd6829c28b0119775ebdaaaed854384e94)

Branding and app identity: Rebrand Juno storefront policy pages. This changed 1 file(s): threadly-v2/public/privacy-policy.html.

- Commit: 6aba43f | Files changed: 1 | Lines: +5 / -5
- Changed files: threadly-v2/public/privacy-policy.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:00 IST — [Rebrand Juno storefront policy pages](https://github.com/jananisr2020/Threadly/commit/4c96dda9c588ee77593081ba52d3682310f2f1c1)

Branding and app identity: Rebrand Juno storefront policy pages. This changed 1 file(s): threadly-v2/public/refund-policy.html.

- Commit: 4c96dda | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/refund-policy.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:10 IST — [Rebrand Juno support pages and shared site config](https://github.com/jananisr2020/Threadly/commit/7b53ceb2902d420e61214c1039677cc6ca330ee3)

Branding and app identity: Rebrand Juno support pages and shared site config. This changed 1 file(s): threadly-v2/public/shipping-policy.html.

- Commit: 7b53ceb | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/shipping-policy.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:15 IST — [Rebrand Juno support pages and shared site config](https://github.com/jananisr2020/Threadly/commit/9544516d4e0fe4661659fecf84bc7a4a0c1d02d2)

Branding and app identity: Rebrand Juno support pages and shared site config. This changed 1 file(s): threadly-v2/public/cookie-policy.html.

- Commit: 9544516 | Files changed: 1 | Lines: +3 / -3
- Changed files: threadly-v2/public/cookie-policy.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:19 IST — [Rebrand Juno support pages and shared site config](https://github.com/jananisr2020/Threadly/commit/d4a1a756da389bf75e7a4dce2d2bcecf33682fd8)

Branding and app identity: Rebrand Juno support pages and shared site config. This changed 1 file(s): threadly-v2/public/offline.html.

- Commit: d4a1a75 | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/offline.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:22 IST — [Rebrand Juno support pages and shared site config](https://github.com/jananisr2020/Threadly/commit/8bddbcbb272d41b830fde6bfd2fae0680d8bbdb0)

Branding and app identity: Rebrand Juno support pages and shared site config. This changed 1 file(s): threadly-v2/public/site-config.js.

- Commit: 8bddbcb | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/site-config.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:29 IST — [Refresh Juno favicon references](https://github.com/jananisr2020/Threadly/commit/893bb275a9c25d39f86bea6bb2bb7a48a022d994)

Branding and app identity: Refresh Juno favicon references. This changed 1 file(s): threadly-v2/public/contact.html.

- Commit: 893bb27 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/contact.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:32 IST — [Refresh Juno favicon references](https://github.com/jananisr2020/Threadly/commit/c33d6011ea9e8b1550e363ce5445eb90e02ae605)

Branding and app identity: Refresh Juno favicon references. This changed 1 file(s): threadly-v2/public/terms.html.

- Commit: c33d601 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/terms.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:36 IST — [Refresh Juno favicon references](https://github.com/jananisr2020/Threadly/commit/7a66c83fc9e8a17cc6cf3b5436a554d9a4973448)

Branding and app identity: Refresh Juno favicon references. This changed 1 file(s): threadly-v2/public/privacy-policy.html.

- Commit: 7a66c83 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/privacy-policy.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:40 IST — [Refresh Juno favicon references](https://github.com/jananisr2020/Threadly/commit/068cef8b82487aaf2276f0222cad498df1ab273c)

Branding and app identity: Refresh Juno favicon references. This changed 1 file(s): threadly-v2/public/refund-policy.html.

- Commit: 068cef8 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/refund-policy.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:59:57 IST — [Rename Android app to Juno](https://github.com/jananisr2020/Threadly/commit/0ab81c4ce68bd9c0b50f1ad501bb97760d0d3895)

Android app: Rename Android app to Juno. This changed 1 file(s): threadly-android/capacitor.config.json.

- Commit: 0ab81c4 | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-android/capacitor.config.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:00:00 IST — [Update Android app package description](https://github.com/jananisr2020/Threadly/commit/5e5ed5dc02265881ac157ee0a75313ac4f48d6b2)

Android app: Update Android app package description. This changed 1 file(s): threadly-android/package.json.

- Commit: 5e5ed5d | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-android/package.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:00:03 IST — [Build Juno Android app with Juno launcher icon](https://github.com/jananisr2020/Threadly/commit/a795ea24207c8f09c975e56e26ecce8c5b27d65c)

Android app: Build Juno Android app with Juno launcher icon. This changed 1 file(s): .github/workflows/build-threadly-android.yml.

- Commit: a795ea2 | Files changed: 1 | Lines: +6 / -6
- Changed files: .github/workflows/build-threadly-android.yml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:00:07 IST — [Update Android build instructions for Juno](https://github.com/jananisr2020/Threadly/commit/00ec66de54226d12f88cc6bced87952776edfa3a)

Android app: Update Android build instructions for Juno. This changed 1 file(s): threadly-android/README.md.

- Commit: 00ec66d | Files changed: 1 | Lines: +7 / -7
- Changed files: threadly-android/README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:00:49 IST — [Refresh service-worker cache for Juno rebrand](https://github.com/jananisr2020/Threadly/commit/6f23f82ea2f4ba08f3c065ebbf7f35ea18891160)

Branding and app identity: Refresh service-worker cache for Juno rebrand. This changed 1 file(s): threadly-v2/public/sw.js.

- Commit: 6f23f82 | Files changed: 1 | Lines: +4 / -4
- Changed files: threadly-v2/public/sw.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:00:53 IST — [Update storefront setup guide for Juno](https://github.com/jananisr2020/Threadly/commit/e4ce131b1c511aa70f920231781020f6069b5af4)

Branding and app identity: Update storefront setup guide for Juno. This changed 1 file(s): threadly-v2/README.md.

- Commit: e4ce131 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:01:46 IST — [Use Juno mark for social previews](https://github.com/jananisr2020/Threadly/commit/ce068747905641f46e4cf48a98480af44961a8cf)

Branding and app identity: Use Juno mark for social previews. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: ce06874 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:01:49 IST — [Stop caching legacy Threadly icon assets](https://github.com/jananisr2020/Threadly/commit/b152ea90d932457703e8b03b654a8ba31e9bdbfd)

Branding and app identity: Stop caching legacy Threadly icon assets. This changed 1 file(s): threadly-v2/public/sw.js.

- Commit: b152ea9 | Files changed: 1 | Lines: +0 / -3
- Changed files: threadly-v2/public/sw.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:02:16 IST — [Keep Android application ID stable for app updates](https://github.com/jananisr2020/Threadly/commit/c5a87d1de09427108b0de114961df0e194072edb)

Android app: Keep Android application ID stable for app updates. This changed 1 file(s): threadly-android/capacitor.config.json.

- Commit: c5a87d1 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-android/capacitor.config.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:15:47 IST — [Improve Juno cart, saved addresses and checkout flow](https://github.com/jananisr2020/Threadly/commit/1e0f3e0eb87783de34abefd4c4556429bc20e42f)

Checkout and orders: Improve Juno cart, saved addresses and checkout flow. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 1e0f3e0 | Files changed: 1 | Lines: +26 / -14
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:16:16 IST — [Save checkout address after order](https://github.com/jananisr2020/Threadly/commit/8eea22fa9bb82ea1abdb326f42cbb70be8b4d6bb)

Checkout and orders: Save checkout address after order. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 8eea22f | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:16:41 IST — [Report live catalogue failures instead of silently showing preview products](https://github.com/jananisr2020/Threadly/commit/fac6924259fe59bf21dd287761fe535457e06928)

Catalogue and products: Report live catalogue failures instead of silently showing preview products. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: fac6924 | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:16:44 IST — [Prevent online checkout when payment recovery cannot be recorded](https://github.com/jananisr2020/Threadly/commit/d90d02a82eae4b4ae1eb93bd2a470559da1d9baf)

Checkout and orders: Prevent online checkout when payment recovery cannot be recorded. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: d90d02a | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:16:57 IST — [Add automated JavaScript syntax validation for Juno checkout](https://github.com/jananisr2020/Threadly/commit/0b0829213675fc91fbd600793aa23674e90cd01b)

Checkout and orders: Add automated JavaScript syntax validation for Juno checkout. This changed 1 file(s): .github/workflows/validate-juno.yml.

- Commit: 0b08292 | Files changed: 1 | Lines: +40 / -0
- Changed files: .github/workflows/validate-juno.yml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:17:22 IST — [Fix storefront syntax-check workflow regex](https://github.com/jananisr2020/Threadly/commit/858eb57142340b7ae2f7589327e3b252d8a63715)

Deployment and validation: Fix storefront syntax-check workflow regex. This changed 1 file(s): .github/workflows/validate-juno.yml.

- Commit: 858eb57 | Files changed: 1 | Lines: +1 / -1
- Changed files: .github/workflows/validate-juno.yml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:17:45 IST — [Respect live stock and quantity limits across Juno product and cart controls](https://github.com/jananisr2020/Threadly/commit/66f41fd86ff426ce75a9b96e7c03294f3a077860)

Checkout and orders: Respect live stock and quantity limits across Juno product and cart controls. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 66f41fd | Files changed: 1 | Lines: +4 / -4
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:18:25 IST — [Update customer emails to Juno branding](https://github.com/jananisr2020/Threadly/commit/0c38eb0ab78e27c9aa59fa535b6e4981afa66375)

Branding and app identity: Update customer emails to Juno branding. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: 0c38eb0 | Files changed: 1 | Lines: +3 / -3
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:18:29 IST — [Update Juno order export filename](https://github.com/jananisr2020/Threadly/commit/6f90e9a74854649335cbfbf177c2b807c8ea1d30)

Checkout and orders: Update Juno order export filename. This changed 1 file(s): threadly-v2/public/admin.html.

- Commit: 6f90e9a | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/admin.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:18:49 IST — [Rename promotional coupon to JUNO10](https://github.com/jananisr2020/Threadly/commit/e701395a88f293fc7625faef5593c8359674d07d)

Checkout and orders: Rename promotional coupon to JUNO10. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: e701395 | Files changed: 1 | Lines: +7 / -7
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:18:52 IST — [Support Juno coupon while preserving old coupon compatibility](https://github.com/jananisr2020/Threadly/commit/737b6d09de3e6c404802fc5a528f4bdfc8bce4e0)

Checkout and orders: Support Juno coupon while preserving old coupon compatibility. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: 737b6d0 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:18:55 IST — [Update Juno coupon in store documentation](https://github.com/jananisr2020/Threadly/commit/6bec488f15bc3446d9ebd7a3b020812fa0d9ae9a)

Checkout and orders: Update Juno coupon in store documentation. This changed 1 file(s): threadly-v2/README.md.

- Commit: 6bec488 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:19:11 IST — [Make Juno checkout a responsive two-column desktop flow](https://github.com/jananisr2020/Threadly/commit/5767dc39238137baf287ee83d94e35b0a2c8992c)

Checkout and orders: Make Juno checkout a responsive two-column desktop flow. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 5767dc3 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:19:29 IST — [Include support ticket storage in Juno health checks](https://github.com/jananisr2020/Threadly/commit/da765b6ad5dc73ee1c8120864a6540c23b252146)

Branding and app identity: Include support ticket storage in Juno health checks. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: da765b6 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:20:13 IST — [Prevent preview products from being ordered when live catalogue is unavailable](https://github.com/jananisr2020/Threadly/commit/abb14e21e7c6a32fbda017dc8cfffc08782b4833)

Catalogue and products: Prevent preview products from being ordered when live catalogue is unavailable. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: abb14e2 | Files changed: 1 | Lines: +5 / -4
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:45:17 IST — [Configure Netlify to deploy the Juno storefront from threadly-v2](https://github.com/jananisr2020/Threadly/commit/5ab06c0f5f5d9ca67a33b433996e315f757d820e)

Branding and app identity: Configure Netlify to deploy the Juno storefront from threadly-v2. This changed 1 file(s): netlify.toml.

- Commit: 5ab06c0 | Files changed: 1 | Lines: +27 / -0
- Changed files: netlify.toml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:46:54 IST — [Remove cash on delivery from Juno storefront](https://github.com/jananisr2020/Threadly/commit/ea7e1e7f132031bb8dcdf71314ad25f4f353be22)

Branding and app identity: Remove cash on delivery from Juno storefront. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: ea7e1e7 | Files changed: 1 | Lines: +7 / -7
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:46:58 IST — [Disable cash on delivery in Juno checkout API](https://github.com/jananisr2020/Threadly/commit/925053f3b142a5615928a5c4803210f451094fe3)

Checkout and orders: Disable cash on delivery in Juno checkout API. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: 925053f | Files changed: 1 | Lines: +3 / -3
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

### Monday, 12 October 2026

#### 14:26:09 IST — [Align Juno Android application ID with app documentation](https://github.com/jananisr2020/Threadly/commit/57c107f696611f53a4245e26baf729319f601e07)

Android app: Align Juno Android application ID with app documentation. This changed 1 file(s): threadly-android/capacitor.config.json.

- Commit: 57c107f | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-android/capacitor.config.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:26:14 IST — [Add maskable Juno PWA icon](https://github.com/jananisr2020/Threadly/commit/8907f170162554e8dd28473596bbef57fa4d8ec2)

Installable web app: Add maskable Juno PWA icon. This changed 1 file(s): threadly-v2/public/manifest.webmanifest.

- Commit: 8907f17 | Files changed: 1 | Lines: +6 / -0
- Changed files: threadly-v2/public/manifest.webmanifest
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:26:17 IST — [Harden Juno Android APK build and icon generation](https://github.com/jananisr2020/Threadly/commit/fd9d9dea4a09185c7039168420a4507d118d0ea5)

Android app: Harden Juno Android APK build and icon generation. This changed 1 file(s): .github/workflows/build-threadly-android.yml.

- Commit: fd9d9de | Files changed: 1 | Lines: +12 / -8
- Changed files: .github/workflows/build-threadly-android.yml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:26:47 IST — [Update Juno deployment guide and document online-only payments](https://github.com/jananisr2020/Threadly/commit/42a36434b7da8616fde9d4d3046c9a6f73c8a1e3)

Checkout and orders: Update Juno deployment guide and document online-only payments. This changed 1 file(s): threadly-v2/README.md.

- Commit: 42a3643 | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:27:14 IST — [Use existing Juno SVG for standard and maskable PWA icon](https://github.com/jananisr2020/Threadly/commit/86e18c26a24752e5ce4fb2a0bf04293ccfa69299)

Installable web app: Use existing Juno SVG for standard and maskable PWA icon. This changed 1 file(s): threadly-v2/public/manifest.webmanifest.

- Commit: 86e18c2 | Files changed: 1 | Lines: +1 / -7
- Changed files: threadly-v2/public/manifest.webmanifest
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:27:35 IST — [Validate Juno branding, online-only checkout and Netlify configuration](https://github.com/jananisr2020/Threadly/commit/47c85a1ac1ede94df1e563b4263907db80cdd9d0)

Checkout and orders: Validate Juno branding, online-only checkout and Netlify configuration. This changed 1 file(s): .github/workflows/validate-juno.yml.

- Commit: 47c85a1 | Files changed: 1 | Lines: +23 / -0
- Changed files: .github/workflows/validate-juno.yml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:55:51 IST — [Restore storefront catalogue from supplied product database](https://github.com/jananisr2020/Threadly/commit/5dae72dcbb892f7a7914518d2d247b9bf5a5b27e)

Catalogue and products: Restore storefront catalogue from supplied product database. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: 5dae72d | Files changed: 1 | Lines: +1439 / -0
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:56:07 IST — [Fallback to bundled database catalogue when live sheet fails](https://github.com/jananisr2020/Threadly/commit/3862be1daf6e9e8c2c30cdb2ad7d97ced2a544d7)

Catalogue and products: Fallback to bundled database catalogue when live sheet fails. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 3862be1 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:56:25 IST — [Add Juno architecture diagram to project documentation](https://github.com/jananisr2020/Threadly/commit/2172871bfcaa59ec172d49f226496b546c06b4e7)

Branding and app identity: Add Juno architecture diagram to project documentation. This changed 1 file(s): docs/juno-architecture.svg.

- Commit: 2172871 | Files changed: 1 | Lines: +18 / -0
- Changed files: docs/juno-architecture.svg
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:57:04 IST — [Document Juno architecture, catalogue recovery, setup and deployment](https://github.com/jananisr2020/Threadly/commit/a044212804247f299ee7fad3864f9eea1db0ae28)

Catalogue and products: Document Juno architecture, catalogue recovery, setup and deployment. This changed 1 file(s): README.md.

- Commit: a044212 | Files changed: 1 | Lines: +235 / -1
- Changed files: README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

### Tuesday, 13 October 2026

#### 15:59:13 IST — [Expand Juno catalogue to 504 products across 18 categories with representative images](https://github.com/jananisr2020/Threadly/commit/b3e258f11863a0c4f2d9aae0efddcfac62620867)

Catalogue and products: Expand Juno catalogue to 504 products across 18 categories with representative images. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: b3e258f | Files changed: 1 | Lines: +1231 / -986
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 15:59:32 IST — [Expand Juno catalogue to 504 products across 18 categories](https://github.com/jananisr2020/Threadly/commit/e7c86df456cf455b59c0b1a5441c5a7541a0ffc4)

Catalogue and products: Expand Juno catalogue to 504 products across 18 categories. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: e7c86df | Files changed: 1 | Lines: +10755 / -795
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 15:59:41 IST — [Document 504-product Juno catalogue and 18 categories](https://github.com/jananisr2020/Threadly/commit/d4cd75a5c5988696f3282dc92137e2608fef2b18)

Catalogue and products: Document 504-product Juno catalogue and 18 categories. This changed 1 file(s): README.md.

- Commit: d4cd75a | Files changed: 1 | Lines: +2 / -2
- Changed files: README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:21:03 IST — [Use distinct category-matched product image requests in Juno catalogue](https://github.com/jananisr2020/Threadly/commit/0b1a47f27777b9b5230ed539e865ea523bc2f9dd)

Catalogue and products: Use distinct category-matched product image requests in Juno catalogue. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: 0b1a47f | Files changed: 1 | Lines: +507 / -507
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:21:06 IST — [Organize Juno homepage into all 18 category tiles](https://github.com/jananisr2020/Threadly/commit/a80c21a3044255dd9d398016385a315e803f9d32)

Branding and app identity: Organize Juno homepage into all 18 category tiles. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: a80c21a | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:21:54 IST — [Reorganize Juno navigation into clear ecommerce-style category groups](https://github.com/jananisr2020/Threadly/commit/068cfe3bfd3d2f50b6bfed3f20c1b6dceedeecb9)

Branding and app identity: Reorganize Juno navigation into clear ecommerce-style category groups. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 068cfe3 | Files changed: 1 | Lines: +20 / -6
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:24:45 IST — [Improve Juno homepage banner with inclusive budget-fashion photography](https://github.com/jananisr2020/Threadly/commit/b9491aa60e7d778bda9e2f6924d6139c78188bd4)

Branding and app identity: Improve Juno homepage banner with inclusive budget-fashion photography. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: b9491aa | Files changed: 1 | Lines: +7 / -6
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:26:29 IST — [Simplify Juno banner CTA and use existing catalogue for product imagery](https://github.com/jananisr2020/Threadly/commit/ce3f4751dca73a281ad20026a8aff69373fcaed1)

Catalogue and products: Simplify Juno banner CTA and use existing catalogue for product imagery. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: ce3f475 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:28:22 IST — [Fix product image fallback using bundled catalogue](https://github.com/jananisr2020/Threadly/commit/51e0b3e12df1520da55920132454092ae9ebfc08)

Catalogue and products: Fix product image fallback using bundled catalogue. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 51e0b3e | Files changed: 1 | Lines: +13 / -5
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:28:34 IST — [Correct catalogue image loader error handling](https://github.com/jananisr2020/Threadly/commit/b73da87e3dca0883010ae7c121846dcdba795eae)

Catalogue and products: Correct catalogue image loader error handling. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: b73da87 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:36:37 IST — [Improve marketplace filters and product sorting](https://github.com/jananisr2020/Threadly/commit/f7339b2ef51f3455f5f38d2045c80a8fa09d073d)

Seller marketplace: Improve marketplace filters and product sorting. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: f7339b2 | Files changed: 1 | Lines: +11 / -9
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:36:51 IST — [Fix clear-all behavior for new filters](https://github.com/jananisr2020/Threadly/commit/134968b93059e411c886041652b250a0b504b05a)

Project maintenance: Fix clear-all behavior for new filters. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 134968b | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:37:08 IST — [Polish filter funnel and sorting choices](https://github.com/jananisr2020/Threadly/commit/a72bcddd7d6faa806257c3a4d648ce5381935e63)

Project maintenance: Polish filter funnel and sorting choices. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: a72bcdd | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:37:20 IST — [Add product-type and attribute-aware filters](https://github.com/jananisr2020/Threadly/commit/fc3010031704acae8decee0b567f8758dedad759)

Project maintenance: Add product-type and attribute-aware filters. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: fc30100 | Files changed: 1 | Lines: +8 / -8
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:37:34 IST — [Ensure clearing all filter facets resets product type](https://github.com/jananisr2020/Threadly/commit/4859f6cf6c917acf738f3328973cab9e88a394d0)

Project maintenance: Ensure clearing all filter facets resets product type. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 4859f6c | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:41:26 IST — [Add category-specific product filters for bags, eyewear, hair accessories and organizers](https://github.com/jananisr2020/Threadly/commit/0be57437ae54ec64b4a63a8a588212c069fdd78f)

Project maintenance: Add category-specific product filters for bags, eyewear, hair accessories and organizers. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 0be5743 | Files changed: 1 | Lines: +10 / -9
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 16:41:41 IST — [Fix category filter reset and clear-all state](https://github.com/jananisr2020/Threadly/commit/70c57c9d57bc39b1e14639ec5d54df881cc7cdfc)

Project maintenance: Fix category filter reset and clear-all state. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 70c57c9 | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 17:15:02 IST — [Show removable chips for category-specific filters](https://github.com/jananisr2020/Threadly/commit/72de6b12362c96b62a6290ba2c14fbd3a3f5a017)

Project maintenance: Show removable chips for category-specific filters. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 72de6b1 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 17:18:23 IST — [Refine category-aware marketplace filters inspired by major ecommerce](https://github.com/jananisr2020/Threadly/commit/ea2ff592b391e28d5faa2b7f8f3f2e7aa301bc7e)

Seller marketplace: Refine category-aware marketplace filters inspired by major ecommerce. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: ea2ff59 | Files changed: 1 | Lines: +3 / -3
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 17:20:45 IST — [Add multi-image product galleries and support five image URLs per product](https://github.com/jananisr2020/Threadly/commit/182ec804b376669511af20850d9f8c5e178e37ff)

Product imagery: Add multi-image product galleries and support five image URLs per product. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 182ec80 | Files changed: 1 | Lines: +8 / -4
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 17:20:56 IST — [Document five-image product gallery workflow](https://github.com/jananisr2020/Threadly/commit/74ad28451dc457749b17d346c12dab5b88df324c)

Documentation: Document five-image product gallery workflow. This changed 1 file(s): README.md.

- Commit: 74ad284 | Files changed: 1 | Lines: +15 / -0
- Changed files: README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 17:21:06 IST — [Fix clicks on product gallery thumbnails](https://github.com/jananisr2020/Threadly/commit/166e3f813f0c356672722823121008622e53e30d)

Product imagery: Fix clicks on product gallery thumbnails. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 166e3f8 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:14:54 IST — [Add MINISO-inspired lifestyle categories to catalogue taxonomy](https://github.com/jananisr2020/Threadly/commit/f7e0a3786cb770f32222f2e7c5a9a34406a3cd7a)

Catalogue and products: Add MINISO-inspired lifestyle categories to catalogue taxonomy. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: f7e0a37 | Files changed: 1 | Lines: +12 / -4
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:14:58 IST — [Show upcoming lifestyle categories on Juno homepage](https://github.com/jananisr2020/Threadly/commit/8a70bfa691b3ec17bf4a32e47e688137caf559c4)

Branding and app identity: Show upcoming lifestyle categories on Juno homepage. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 8a70bfa | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:15:02 IST — [Document Juno lifestyle category expansion](https://github.com/jananisr2020/Threadly/commit/e6d86082320a34b2ecaee3a6eabb8e54b66986c1)

Branding and app identity: Document Juno lifestyle category expansion. This changed 1 file(s): README.md.

- Commit: e6d8608 | Files changed: 1 | Lines: +5 / -0
- Changed files: README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:15:15 IST — [Fix Juno lifestyle category card rendering](https://github.com/jananisr2020/Threadly/commit/31a603ddd95a962488237d4b10f2227fbca1e0ff)

Branding and app identity: Fix Juno lifestyle category card rendering. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 31a603d | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:17:30 IST — [Remove Personal Care, Fragrance and Snacks categories](https://github.com/jananisr2020/Threadly/commit/fc82a6c632600ab960aaf15656b07d883ffae617)

Project maintenance: Remove Personal Care, Fragrance and Snacks categories. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: fc82a6c | Files changed: 1 | Lines: +2 / -5
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:17:46 IST — [Remove three lifestyle category cards from homepage](https://github.com/jananisr2020/Threadly/commit/e5209115c632a46ebb537dc013a159e76044163f)

Project maintenance: Remove three lifestyle category cards from homepage. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: e520911 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:17:50 IST — [Update README for five remaining lifestyle categories](https://github.com/jananisr2020/Threadly/commit/62e15692c34a0d8ed06796235f1d064e8e88250a)

Documentation: Update README for five remaining lifestyle categories. This changed 1 file(s): README.md.

- Commit: 62e1569 | Files changed: 1 | Lines: +1 / -1
- Changed files: README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:26:23 IST — [Add representative lifestyle category images](https://github.com/jananisr2020/Threadly/commit/b25f45b333f2f9a9b0791e81f1e191c0032c352b)

Product imagery: Add representative lifestyle category images. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: b25f45b | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:26:26 IST — [Refresh bundled catalogue after storefront updates](https://github.com/jananisr2020/Threadly/commit/1d02c36a909855e167c008f5594ac386d568270d)

Catalogue and products: Refresh bundled catalogue after storefront updates. This changed 1 file(s): threadly-v2/public/sw.js.

- Commit: 1d02c36 | Files changed: 1 | Lines: +15 / -1
- Changed files: threadly-v2/public/sw.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:26:29 IST — [Validate bundled catalogue and category image assets](https://github.com/jananisr2020/Threadly/commit/42a47c0ccd138bf2900ef8ab559a8fa0b1dd8e07)

Catalogue and products: Validate bundled catalogue and category image assets. This changed 1 file(s): .github/workflows/validate-juno.yml.

- Commit: 42a47c0 | Files changed: 1 | Lines: +10 / -0
- Changed files: .github/workflows/validate-juno.yml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:26:44 IST — [Add plush toys representative category illustration](https://github.com/jananisr2020/Threadly/commit/f46c5d28618549878123ea763404896aafc10f4c)

Project maintenance: Add plush toys representative category illustration. This changed 1 file(s): threadly-v2/public/images/categories/plush-toys.svg.

- Commit: f46c5d2 | Files changed: 1 | Lines: +1 / -0
- Changed files: threadly-v2/public/images/categories/plush-toys.svg
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:26:47 IST — [Add stationery representative category illustration](https://github.com/jananisr2020/Threadly/commit/3fed3b551bf8b5d9b2c4d83e2df418bb0f2d7d11)

Project maintenance: Add stationery representative category illustration. This changed 1 file(s): threadly-v2/public/images/categories/stationery.svg.

- Commit: 3fed3b5 | Files changed: 1 | Lines: +1 / -0
- Changed files: threadly-v2/public/images/categories/stationery.svg
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:26:49 IST — [Add home and kitchen representative category illustration](https://github.com/jananisr2020/Threadly/commit/1a07e5639ffa78a1ec186eb2404a2732d2db6e60)

Project maintenance: Add home and kitchen representative category illustration. This changed 1 file(s): threadly-v2/public/images/categories/home-kitchen.svg.

- Commit: 1a07e56 | Files changed: 1 | Lines: +1 / -0
- Changed files: threadly-v2/public/images/categories/home-kitchen.svg
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:26:53 IST — [Add drinkware and lunch representative category illustration](https://github.com/jananisr2020/Threadly/commit/b96c0ee261be6e9478670656b1694b1525467008)

Project maintenance: Add drinkware and lunch representative category illustration. This changed 1 file(s): threadly-v2/public/images/categories/drinkware.svg.

- Commit: b96c0ee | Files changed: 1 | Lines: +1 / -0
- Changed files: threadly-v2/public/images/categories/drinkware.svg
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:26:56 IST — [Add tech accessories representative category illustration](https://github.com/jananisr2020/Threadly/commit/70a2f88469511fb8398210ca6b50fe3ffb9b6f46)

Project maintenance: Add tech accessories representative category illustration. This changed 1 file(s): threadly-v2/public/images/categories/tech-accessories.svg.

- Commit: 70a2f88 | Files changed: 1 | Lines: +1 / -0
- Changed files: threadly-v2/public/images/categories/tech-accessories.svg
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:28:52 IST — [Make the product catalogue directly accessible from homepage](https://github.com/jananisr2020/Threadly/commit/7cc9a9cb37f6116288e68b67f94f9074ff8122fe)

Catalogue and products: Make the product catalogue directly accessible from homepage. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 7cc9a9c | Files changed: 1 | Lines: +4 / -4
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:14:13 IST — [Remove unavailable coming-soon category cards from Juno storefront](https://github.com/jananisr2020/Threadly/commit/892a875cbaf6972a7ae5528ebe363281e5c822af)

Branding and app identity: Remove unavailable coming-soon category cards from Juno storefront. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 892a875 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:22:42 IST — [Load bundled Juno catalogue and product images without sheet configuration](https://github.com/jananisr2020/Threadly/commit/c2ab27a85b512a6e728504becf63ffc05ae12e8e)

Catalogue and products: Load bundled Juno catalogue and product images without sheet configuration. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: c2ab27a | Files changed: 1 | Lines: +15 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:26:08 IST — [Add 100 products and category images across five new Juno categories](https://github.com/jananisr2020/Threadly/commit/c4de011dca1ee0e60576ea6829d10c06983d1a52)

Branding and app identity: Add 100 products and category images across five new Juno categories. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: c4de011 | Files changed: 1 | Lines: +2303 / -3
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:31:27 IST — [Add five-image galleries to Juno catalogue](https://github.com/jananisr2020/Threadly/commit/d337c5c0d40c635452f3c3b9fe69472739152aa2)

Catalogue and products: Add five-image galleries to Juno catalogue. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: d337c5c | Files changed: 1 | Lines: +4834 / -606
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

### Wednesday, 14 October 2026

#### 13:06:33 IST — [Connect Juno AI product images to live database](https://github.com/jananisr2020/Threadly/commit/0a0f9211cd88a42a779226c81b6fffbbec57e76f)

Branding and app identity: Connect Juno AI product images to live database. Add scheduled image generation for existing and newly added Products sheet rows, persist gallery images in Netlify Blobs, and render AI image columns in the storefront. Files: threadly-v2/AI_PRODUCT_STUDIO.md, threadly-v2/AI_PRODUCT_VIEW_BATCH.md, threadly-v2/netlify/functions/ai-product-views.js, threadly-v2/netlify/functions/product-image-scheduler.js, and 7 more file(s).

- Commit: 0a0f921 | Files changed: 11 | Lines: +793 / -5
- Changed files: threadly-v2/AI_PRODUCT_STUDIO.md, threadly-v2/AI_PRODUCT_VIEW_BATCH.md, threadly-v2/netlify/functions/ai-product-views.js, threadly-v2/netlify/functions/product-image-scheduler.js, threadly-v2/netlify/functions/product-image-worker-background.js, threadly-v2/netlify/functions/product-image.js, plus 5 more
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 13:36:38 IST — [Automate Juno product image population](https://github.com/jananisr2020/Threadly/commit/0a5e2fab601b89cec0377f4415f27bbfba6a0dfc)

Branding and app identity: Automate Juno product image population. Add scheduled Google Sheets image queue and Cloudinary persistence. Files: threadly-v2/AUTOMATIC_PRODUCT_IMAGES.md, threadly-v2/netlify/functions/product-image-sync.js.

- Commit: 0a5e2fa | Files changed: 2 | Lines: +93 / -0
- Changed files: threadly-v2/AUTOMATIC_PRODUCT_IMAGES.md, threadly-v2/netlify/functions/product-image-sync.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 13:36:59 IST — [Run image generation in a background function](https://github.com/jananisr2020/Threadly/commit/41def13e3dca797d461cb93fba2ea3e951c6fa3d)

Product imagery: Run image generation in a background function. This changed 1 file(s): threadly-v2/netlify/functions/product-image-sync-background.js.

- Commit: 41def13 | Files changed: 1 | Lines: +61 / -0
- Changed files: threadly-v2/netlify/functions/product-image-sync-background.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 13:37:02 IST — [Dispatch scheduled image work to background function](https://github.com/jananisr2020/Threadly/commit/1976a566667b9124c581dab539ecb034b404ed63)

Product imagery: Dispatch scheduled image work to background function. This changed 1 file(s): threadly-v2/netlify/functions/product-image-sync.js.

- Commit: 1976a56 | Files changed: 1 | Lines: +26 / -60
- Changed files: threadly-v2/netlify/functions/product-image-sync.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 13:37:09 IST — [Document background image worker configuration](https://github.com/jananisr2020/Threadly/commit/953f4e7e26f86229e1269f0b333ee4f1245ea0c7)

Documentation: Document background image worker configuration. This changed 1 file(s): threadly-v2/AUTOMATIC_PRODUCT_IMAGES.md.

- Commit: 953f4e7 | Files changed: 1 | Lines: +4 / -4
- Changed files: threadly-v2/AUTOMATIC_PRODUCT_IMAGES.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 13:37:26 IST — [Support existing primary image URL column names](https://github.com/jananisr2020/Threadly/commit/1cd73427af73df918ab2416431b549498d27f771)

Product imagery: Support existing primary image URL column names. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 1cd7342 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:21:11 IST — [Add local open-weight Juno product image generator](https://github.com/jananisr2020/Threadly/commit/0038160e861792013526d16637267c6e10ac4748)

Branding and app identity: Add local open-weight Juno product image generator. Add local SDXL Turbo image generation without inference API keys and harden pipeline loading/output paths. Files: threadly-v2/LOCAL_IMAGE_GENERATION.md, threadly-v2/requirements-local-image-generation.txt, threadly-v2/scripts/generate_product_views_local.py.

- Commit: 0038160 | Files changed: 3 | Lines: +217 / -0
- Changed files: threadly-v2/LOCAL_IMAGE_GENERATION.md, threadly-v2/requirements-local-image-generation.txt, threadly-v2/scripts/generate_product_views_local.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:23:23 IST — [Add local Google Sheets image generation and publish worker](https://github.com/jananisr2020/Threadly/commit/cdf5b52f38fed587bb41d790766c5d5143ba7f6f)

Product imagery: Add local Google Sheets image generation and publish worker. This changed 1 file(s): threadly-v2/scripts/sync_sheet_product_images.py.

- Commit: cdf5b52 | Files changed: 1 | Lines: +208 / -0
- Changed files: threadly-v2/scripts/sync_sheet_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:23:31 IST — [Publish image assets before updating Google Sheets URLs](https://github.com/jananisr2020/Threadly/commit/3ec457a047d3236e670e13e9acdd3ce4465cda92)

Product imagery: Publish image assets before updating Google Sheets URLs. This changed 1 file(s): threadly-v2/scripts/sync_sheet_product_images.py.

- Commit: 3ec457a | Files changed: 1 | Lines: +6 / -2
- Changed files: threadly-v2/scripts/sync_sheet_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:23:37 IST — [Add Google Sheets auth dependency for local image sync](https://github.com/jananisr2020/Threadly/commit/fcac0cfa597a7abf3752cb2d64046796a8f6886c)

Product imagery: Add Google Sheets auth dependency for local image sync. This changed 1 file(s): threadly-v2/requirements-local-image-generation.txt.

- Commit: fcac0cf | Files changed: 1 | Lines: +1 / -0
- Changed files: threadly-v2/requirements-local-image-generation.txt
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:23:50 IST — [Document local Google Sheets image sync and Netlify deployment boundary](https://github.com/jananisr2020/Threadly/commit/c317c0b2aeef6fe9c460ae6350fbedbc6b833e17)

Documentation: Document local Google Sheets image sync and Netlify deployment boundary. This changed 1 file(s): threadly-v2/LOCAL_IMAGE_GENERATION.md.

- Commit: c317c0b | Files changed: 1 | Lines: +52 / -15
- Changed files: threadly-v2/LOCAL_IMAGE_GENERATION.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:24:03 IST — [Support batching multiple product IDs in one model session](https://github.com/jananisr2020/Threadly/commit/de31884ab4a523fad03233b15b11b28a561feb41)

Project maintenance: Support batching multiple product IDs in one model session. This changed 1 file(s): threadly-v2/scripts/generate_product_views_local.py.

- Commit: de31884 | Files changed: 1 | Lines: +7 / -4
- Changed files: threadly-v2/scripts/generate_product_views_local.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:24:15 IST — [Batch product image generation and sync Google Sheets after publish](https://github.com/jananisr2020/Threadly/commit/d0dc2f3eb6684310cda5fe8244dc31996b20e297)

Product imagery: Batch product image generation and sync Google Sheets after publish. This changed 1 file(s): threadly-v2/scripts/sync_sheet_product_images.py.

- Commit: d0dc2f3 | Files changed: 1 | Lines: +47 / -18
- Changed files: threadly-v2/scripts/sync_sheet_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:24:28 IST — [Remove API-key-based scheduled image sync; use local open-weight worker](https://github.com/jananisr2020/Threadly/commit/ca64480240fc66a92b89a8017d192912ff50f70f)

Product imagery: Remove API-key-based scheduled image sync; use local open-weight worker. This changed 1 file(s): threadly-v2/netlify/functions/product-image-sync.js.

- Commit: ca64480 | Files changed: 1 | Lines: +0 / -27
- Changed files: threadly-v2/netlify/functions/product-image-sync.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:24:31 IST — [Remove API-key-based scheduled image sync; use local open-weight worker](https://github.com/jananisr2020/Threadly/commit/47f101cfa7b5309b8b1eb196e5d96539cc2c6c75)

Product imagery: Remove API-key-based scheduled image sync; use local open-weight worker. This changed 1 file(s): threadly-v2/netlify/functions/product-image-sync-background.js.

- Commit: 47f101c | Files changed: 1 | Lines: +0 / -61
- Changed files: threadly-v2/netlify/functions/product-image-sync-background.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 14:25:08 IST — [Fix catalogue JSON newline when syncing products](https://github.com/jananisr2020/Threadly/commit/7e44404d793bb3f67feba79389f5c4dc9f93536f)

Catalogue and products: Fix catalogue JSON newline when syncing products. This changed 1 file(s): threadly-v2/scripts/sync_sheet_product_images.py.

- Commit: 7e44404 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/scripts/sync_sheet_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:25:27 IST — [Integrate local image generation with Juno catalogue and XLSX updates](https://github.com/jananisr2020/Threadly/commit/b988f09ed70f9a15e0ded33ba883c9cebfa48911)

Catalogue and products: Integrate local image generation with Juno catalogue and XLSX updates. This changed 1 file(s): threadly-v2/scripts/generate_product_views.py.

- Commit: b988f09 | Files changed: 1 | Lines: +156 / -100
- Changed files: threadly-v2/scripts/generate_product_views.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:26:16 IST — [Fix selected-product XLSX image reference updates](https://github.com/jananisr2020/Threadly/commit/5457d44e565be58fb4cef2ea76e8ce2dd56bdf3e)

Product imagery: Fix selected-product XLSX image reference updates. This changed 1 file(s): threadly-v2/scripts/generate_product_views.py.

- Commit: 5457d44 | Files changed: 1 | Lines: +26 / -21
- Changed files: threadly-v2/scripts/generate_product_views.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:26:27 IST — [Load local API key from project .env](https://github.com/jananisr2020/Threadly/commit/6de7665645cb5396c7624e7291536ac1fe406bc7)

Project maintenance: Load local API key from project .env. This changed 1 file(s): threadly-v2/scripts/generate_product_views.py.

- Commit: 6de7665 | Files changed: 1 | Lines: +2 / -0
- Changed files: threadly-v2/scripts/generate_product_views.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:26:59 IST — [Document local image generation and catalogue/XLSX integration](https://github.com/jananisr2020/Threadly/commit/9de99d99c5ea421bb34cbc5dc8211021e88877e5)

Catalogue and products: Document local image generation and catalogue/XLSX integration. This changed 1 file(s): threadly-v2/AI_PRODUCT_STUDIO.md.

- Commit: 9de99d9 | Files changed: 1 | Lines: +74 / -18
- Changed files: threadly-v2/AI_PRODUCT_STUDIO.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:27:22 IST — [Fix JSON newline and workbook image header matching](https://github.com/jananisr2020/Threadly/commit/6dd789cb0ccf52b96f86d0d957b373e6e91183e6)

Product imagery: Fix JSON newline and workbook image header matching. This changed 1 file(s): threadly-v2/scripts/generate_product_views.py.

- Commit: 6dd789c | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/scripts/generate_product_views.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:27:35 IST — [Add dependencies for local Juno image generation and XLSX updates](https://github.com/jananisr2020/Threadly/commit/c336d9fbd10b26cfb806ba3b45841f68d4199592)

Branding and app identity: Add dependencies for local Juno image generation and XLSX updates. This changed 1 file(s): threadly-v2/requirements-image-generation.txt.

- Commit: c336d9f | Files changed: 1 | Lines: +3 / -0
- Changed files: threadly-v2/requirements-image-generation.txt
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:27:44 IST — [Use the committed image-generation requirements file](https://github.com/jananisr2020/Threadly/commit/5d4573ae18e5bfc8b8f64c098e351a8551d6b35d)

Product imagery: Use the committed image-generation requirements file. This changed 1 file(s): threadly-v2/AI_PRODUCT_STUDIO.md.

- Commit: 5d4573a | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/AI_PRODUCT_STUDIO.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:30:31 IST — [Ignore local Python virtual environments](https://github.com/jananisr2020/Threadly/commit/b4e73fa24b3a4a1ed56113f2ac8c4e330ddff886)

Project maintenance: Ignore local Python virtual environments. This changed 1 file(s): threadly-v2/.gitignore.

- Commit: b4e73fa | Files changed: 1 | Lines: +2 / -0
- Changed files: threadly-v2/.gitignore
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:46:01 IST — [Fall back to text-only product image generation when reference URLs fail](https://github.com/jananisr2020/Threadly/commit/d424fb9f73fc2a41bb06dba04a91ab4629f59e4f)

Product imagery: Fall back to text-only product image generation when reference URLs fail. This changed 1 file(s): threadly-v2/scripts/generate_product_views.py.

- Commit: d424fb9 | Files changed: 1 | Lines: +43 / -6
- Changed files: threadly-v2/scripts/generate_product_views.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:51:56 IST — [Add free-source product image downloader for Juno](https://github.com/jananisr2020/Threadly/commit/ceed3d28d98f13fee8d9f7d46666db6b63721659)

Branding and app identity: Add free-source product image downloader for Juno. This changed 1 file(s): threadly-v2/scripts/download_free_product_images.py.

- Commit: ceed3d2 | Files changed: 1 | Lines: +274 / -0
- Changed files: threadly-v2/scripts/download_free_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:52:09 IST — [Fix retry pacing and manifest timestamps in free image downloader](https://github.com/jananisr2020/Threadly/commit/2e6c00f20c246dcc931dad4ec1d813e44b4ec2af)

Installable web app: Fix retry pacing and manifest timestamps in free image downloader. This changed 1 file(s): threadly-v2/scripts/download_free_product_images.py.

- Commit: 2e6c00f | Files changed: 1 | Lines: +1 / -0
- Changed files: threadly-v2/scripts/download_free_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:52:38 IST — [Avoid reusing image sources and resume missing gallery views correctly](https://github.com/jananisr2020/Threadly/commit/547ced5ff3febc22c0704d33e85aadcd30c35adb)

Product imagery: Avoid reusing image sources and resume missing gallery views correctly. This changed 1 file(s): threadly-v2/scripts/download_free_product_images.py.

- Commit: 547ced5 | Files changed: 1 | Lines: +23 / -16
- Changed files: threadly-v2/scripts/download_free_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:53:07 IST — [Document free-source product image workflow for Juno](https://github.com/jananisr2020/Threadly/commit/9ae11b22340cf1d649f6d92ef81d0dce3de920c1)

Branding and app identity: Document free-source product image workflow for Juno. This changed 1 file(s): threadly-v2/README.md.

- Commit: 9ae11b2 | Files changed: 1 | Lines: +35 / -0
- Changed files: threadly-v2/README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:53:25 IST — [Label free-source photos as images rather than implying verified camera angles](https://github.com/jananisr2020/Threadly/commit/12f5676d6ff5b43f841bc78c98623ddf1b97b013)

Product imagery: Label free-source photos as images rather than implying verified camera angles. This changed 1 file(s): threadly-v2/scripts/download_free_product_images.py.

- Commit: 12f5676 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/scripts/download_free_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:57:52 IST — [Remove unsuitable Wikimedia product image downloader](https://github.com/jananisr2020/Threadly/commit/49467d2c7c4d062183be084ff8bc6023a0e5fda9)

Product imagery: Remove unsuitable Wikimedia product image downloader. This changed 1 file(s): threadly-v2/scripts/download_free_product_images.py.

- Commit: 49467d2 | Files changed: 1 | Lines: +0 / -282
- Changed files: threadly-v2/scripts/download_free_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:57:59 IST — [Remove Wikimedia image workflow documentation](https://github.com/jananisr2020/Threadly/commit/eba140f56200a7a1c8f1105f1106752ff3eefd56)

Documentation: Remove Wikimedia image workflow documentation. This changed 1 file(s): threadly-v2/README.md.

- Commit: eba140f | Files changed: 1 | Lines: +0 / -34
- Changed files: threadly-v2/README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 19:58:35 IST — [Remove broken placeholder product images from Juno catalogue](https://github.com/jananisr2020/Threadly/commit/adb5a65748a7fc99a3db81b9d3cd1acf2d6abfef)

Catalogue and products: Remove broken placeholder product images from Juno catalogue. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: adb5a65 | Files changed: 1 | Lines: +1210 / -4833
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:06:00 IST — [Remove irrelevant product images from Juno catalogue](https://github.com/jananisr2020/Threadly/commit/5f65383013a31852020be4c9a54745eedd78622f)

Catalogue and products: Remove irrelevant product images from Juno catalogue. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: 5f65383 | Files changed: 1 | Lines: +3 / -3
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:06:58 IST — [Remove irrelevant fashion banner image](https://github.com/jananisr2020/Threadly/commit/9ac1ae84da1e722721937c825f30641cc1a108a4)

Product imagery: Remove irrelevant fashion banner image. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 9ac1ae8 | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:08:59 IST — [Remove all product pictures and placeholder illustrations](https://github.com/jananisr2020/Threadly/commit/d120025dc036a0ff454415cc13c9e3cfa8e56cfa)

Project maintenance: Remove all product pictures and placeholder illustrations. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: d120025 | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:11:26 IST — [Hide category display thumbnails including hair accessories](https://github.com/jananisr2020/Threadly/commit/0d1fa7c300f23e09dd0cc9757b73ca4acbfc7705)

Project maintenance: Hide category display thumbnails including hair accessories. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 0d1fa7c | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:15:26 IST — [Enable generated product images in Juno catalogue](https://github.com/jananisr2020/Threadly/commit/599a2f27f7d9c30bdf0f7a0045606483ff1dc1c7)

Catalogue and products: Enable generated product images in Juno catalogue. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 599a2f2 | Files changed: 1 | Lines: +2 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:16:08 IST — [Add Juno product image generation script](https://github.com/jananisr2020/Threadly/commit/174f4bf894f62a1077e823703b5caad2f2042b56)

Branding and app identity: Add Juno product image generation script. This changed 1 file(s): threadly-v2/scripts/auto_product_images.py.

- Commit: 174f4bf | Files changed: 1 | Lines: +213 / -0
- Changed files: threadly-v2/scripts/auto_product_images.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 20:16:14 IST — [Refresh Juno PWA cache for product image support](https://github.com/jananisr2020/Threadly/commit/ea28552ad5ce1b6eeeb4efac8d22cf11f9ac8f44)

Installable web app: Refresh Juno PWA cache for product image support. This changed 1 file(s): threadly-v2/public/sw.js.

- Commit: ea28552 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/public/sw.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

### Saturday, 17 October 2026

#### 15:37:38 IST — [Build Juno marketplace seller onboarding and fulfilment](https://github.com/jananisr2020/Threadly/commit/5213385a1bba6fbf7f91940c12e42c95c7e808e8)

Seller marketplace: Build Juno marketplace seller onboarding and fulfilment. Add seller applications, seller studio, moderated product listings, seller fulfilment orders, reconciliation ledger, payment verification safeguards, and setup documentation. Seller payouts remain unimplemented. Files: .github/workflows/validate-juno.yml, threadly-v2/MARKETPLACE_ROADMAP.md, threadly-v2/README.md, threadly-v2/netlify/functions/seller-activate.js, and 9 more file(s).

- Commit: 5213385 | Files changed: 13 | Lines: +518 / -13
- Changed files: .github/workflows/validate-juno.yml, threadly-v2/MARKETPLACE_ROADMAP.md, threadly-v2/README.md, threadly-v2/netlify/functions/seller-activate.js, threadly-v2/netlify/functions/seller-apply.js, threadly-v2/netlify/functions/seller-login.js, plus 7 more
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 15:39:01 IST — [Add automatic Google Sheets tab setup for Juno marketplace](https://github.com/jananisr2020/Threadly/commit/6b42bd33b67e87c68603461edce87183713518d9)

Seller marketplace: Add automatic Google Sheets tab setup for Juno marketplace. This changed 1 file(s): threadly-v2/netlify/lib/sheets.js.

- Commit: 6b42bd3 | Files changed: 1 | Lines: +32 / -0
- Changed files: threadly-v2/netlify/lib/sheets.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 15:39:33 IST — [Auto-create Juno marketplace Google Sheets tabs](https://github.com/jananisr2020/Threadly/commit/24444d723f0120611acb205455bcc91f5f439636)

Seller marketplace: Auto-create Juno marketplace Google Sheets tabs. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: 24444d7 | Files changed: 1 | Lines: +14 / -4
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 15:39:52 IST — [Use valid Google Sheets metadata field mask](https://github.com/jananisr2020/Threadly/commit/a543d39f7d3a7d0010753cdc531225753bec5fc2)

Search visibility: Use valid Google Sheets metadata field mask. This changed 1 file(s): threadly-v2/netlify/lib/sheets.js.

- Commit: a543d39 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/netlify/lib/sheets.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 15:39:56 IST — [Document automatic Juno marketplace sheet creation](https://github.com/jananisr2020/Threadly/commit/113f4700c8872d5ff1ca0d4ed58e1f94aa78426d)

Seller marketplace: Document automatic Juno marketplace sheet creation. This changed 1 file(s): threadly-v2/README.md.

- Commit: 113f470 | Files changed: 1 | Lines: +3 / -3
- Changed files: threadly-v2/README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 15:42:18 IST — [Show Sell on Juno call-to-action on homepage](https://github.com/jananisr2020/Threadly/commit/35531ed3dca3c3c704584c6e051d008b5ed8d9a1)

Branding and app identity: Show Sell on Juno call-to-action on homepage. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 35531ed | Files changed: 1 | Lines: +2 / -0
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 17:01:31 IST — [Fix Juno seller form submission](https://github.com/jananisr2020/Threadly/commit/8245f0e65860e4267c1389c64daf0df6e994dd7b)

Seller marketplace: Fix Juno seller form submission. Avoid unnecessary marketplace tab creation during seller applications and return actionable Google Sheets errors. Files: threadly-v2/netlify/lib/core.js, threadly-v2/public/index.html.

- Commit: 8245f0e | Files changed: 2 | Lines: +24 / -4
- Changed files: threadly-v2/netlify/lib/core.js, threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 23:34:40 IST — [Add clearly labelled demo reviews for Juno products](https://github.com/jananisr2020/Threadly/commit/73fe70efb53f1870b16de1976364840305b28473)

Branding and app identity: Add clearly labelled demo reviews for Juno products. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 73fe70e | Files changed: 1 | Lines: +6 / -2
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

### Sunday, 18 October 2026

#### 22:11:21 IST — [Fix Juno signup and password validation (#19)](https://github.com/jananisr2020/Threadly/commit/7972c9712ece17fc5f73147b6bd7e010139bef31)

Branding and app identity: Fix Juno signup and password validation (#19). * Enforce password policy for signup and reset * Improve Juno signup and login validation messages Files: threadly-v2/netlify/lib/core.js, threadly-v2/public/index.html.

- Commit: 7972c97 | Files changed: 2 | Lines: +22 / -7
- Changed files: threadly-v2/netlify/lib/core.js, threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

### Monday, 19 October 2026

#### 21:09:17 IST — [Add Juno coupons, invoices and product comparison](https://github.com/jananisr2020/Threadly/commit/57ebdc88488247c5c6d82ead46965be26f9d1dd0)

Checkout and orders: Add Juno coupons, invoices and product comparison. This changed 1 file(s): threadly-v2/public/index.html.

- Commit: 57ebdc8 | Files changed: 1 | Lines: +14 / -8
- Changed files: threadly-v2/public/index.html
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:09:28 IST — [Use shared Juno coupon rules for checkout pricing](https://github.com/jananisr2020/Threadly/commit/7665187a0ab01e06c0712ca54213888549af8a16)

Checkout and orders: Use shared Juno coupon rules for checkout pricing. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: 7665187 | Files changed: 1 | Lines: +1 / -1
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:09:43 IST — [Add shared Juno coupon rules](https://github.com/jananisr2020/Threadly/commit/e2f6d8ea073813b3e1a8ed04ea3848bd91589954)

Checkout and orders: Add shared Juno coupon rules. This changed 1 file(s): threadly-v2/netlify/lib/coupons.js.

- Commit: e2f6d8e | Files changed: 1 | Lines: +25 / -0
- Changed files: threadly-v2/netlify/lib/coupons.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:09:45 IST — [Expose active Juno coupons to storefront](https://github.com/jananisr2020/Threadly/commit/0610af91357ab4d81ab717d0b27556152771e7dc)

Checkout and orders: Expose active Juno coupons to storefront. This changed 1 file(s): threadly-v2/netlify/functions/coupons.js.

- Commit: 0610af9 | Files changed: 1 | Lines: +10 / -0
- Changed files: threadly-v2/netlify/functions/coupons.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:15:03 IST — [Reprice Juno catalogue for budget finds](https://github.com/jananisr2020/Threadly/commit/46d01c5b30c4fd2980659992c8f9ea30059e173b)

Catalogue and products: Reprice Juno catalogue for budget finds. This changed 1 file(s): threadly-v2/public/catalog.json.

- Commit: 46d01c5 | Files changed: 1 | Lines: +1805 / -1799
- Changed files: threadly-v2/public/catalog.json
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:15:06 IST — [Apply budget pricing consistently to catalogue and checkout](https://github.com/jananisr2020/Threadly/commit/136cae1b8236bf1a9593ce996679070b67e81d46)

Catalogue and products: Apply budget pricing consistently to catalogue and checkout. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: 136cae1 | Files changed: 1 | Lines: +35 / -1
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:15:09 IST — [Document Juno budget catalogue pricing](https://github.com/jananisr2020/Threadly/commit/b964038825cbe5370579cff135a7e26893297307)

Catalogue and products: Document Juno budget catalogue pricing. This changed 1 file(s): README.md.

- Commit: b964038 | Files changed: 1 | Lines: +1 / -1
- Changed files: README.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:20:10 IST — [Harden Juno checkout stock and order validation](https://github.com/jananisr2020/Threadly/commit/dbe3a82006b04e0bbf972979f1afbb7ffad81c4d)

Checkout and orders: Harden Juno checkout stock and order validation. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: dbe3a82 | Files changed: 1 | Lines: +18 / -5
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:23:02 IST — [Flag paid orders needing inventory reconciliation](https://github.com/jananisr2020/Threadly/commit/a6b9543e965570f0cf7896138655685a38fcbf75)

Checkout and orders: Flag paid orders needing inventory reconciliation. This changed 1 file(s): threadly-v2/netlify/lib/core.js.

- Commit: a6b9543 | Files changed: 1 | Lines: +39 / -5
- Changed files: threadly-v2/netlify/lib/core.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:28:26 IST — [Add Juno project commit history tracker](https://github.com/jananisr2020/Threadly/commit/cd90f0362e6fcfa108d42d2b56cdf134c9ee7500)

Branding and app identity: Add Juno project commit history tracker. This changed 1 file(s): project-tracker.csv.

- Commit: cd90f03 | Files changed: 1 | Lines: +164 / -0
- Changed files: project-tracker.csv
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:28:34 IST — [Document Juno project tracker and verification status](https://github.com/jananisr2020/Threadly/commit/2bc7b7d3892157e7f30239f944fee83863ea25b6)

Branding and app identity: Document Juno project tracker and verification status. This changed 1 file(s): PROJECT_TRACKER.md.

- Commit: 2bc7b7d | Files changed: 1 | Lines: +38 / -0
- Changed files: PROJECT_TRACKER.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:29:13 IST — [Include tracker bootstrap commits in history log](https://github.com/jananisr2020/Threadly/commit/82240b963f06ee1e81824bcafbade62b42b62a76)

Project maintenance: Include tracker bootstrap commits in history log. This changed 1 file(s): project-tracker.csv.

- Commit: 82240b9 | Files changed: 1 | Lines: +2 / -0
- Changed files: project-tracker.csv
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:29:15 IST — [Clarify tracker bootstrap history coverage](https://github.com/jananisr2020/Threadly/commit/97fa4849e03f42005feb0eda688ae780f16c6906)

Project maintenance: Clarify tracker bootstrap history coverage. This changed 1 file(s): PROJECT_TRACKER.md.

- Commit: 97fa484 | Files changed: 1 | Lines: +1 / -1
- Changed files: PROJECT_TRACKER.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:29:32 IST — [Add verified timestamps for tracker bootstrap commits](https://github.com/jananisr2020/Threadly/commit/41cd9a40e6f73e1821cb5405e68137cbe9bfc230)

Project maintenance: Add verified timestamps for tracker bootstrap commits. This changed 1 file(s): project-tracker.csv.

- Commit: 41cd9a4 | Files changed: 1 | Lines: +2 / -2
- Changed files: project-tracker.csv
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:30:06 IST — [Clarify unavailable line-change statistics in tracker](https://github.com/jananisr2020/Threadly/commit/82ab2d44083c8d9685e239b28b449b782b4bde27)

Project maintenance: Clarify unavailable line-change statistics in tracker. This changed 1 file(s): project-tracker.csv.

- Commit: 82ab2d4 | Files changed: 1 | Lines: +12 / -12
- Changed files: project-tracker.csv
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:30:33 IST — [Clean tracker CSV fields for spreadsheet import](https://github.com/jananisr2020/Threadly/commit/46c5a6a250d57b0626591eecd10af224d94dd590)

Project maintenance: Clean tracker CSV fields for spreadsheet import. This changed 1 file(s): project-tracker.csv.

- Commit: 46c5a6a | Files changed: 1 | Lines: +12 / -12
- Changed files: project-tracker.csv
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:31:42 IST — [Backfill changed-file lists for historical Juno commits](https://github.com/jananisr2020/Threadly/commit/7fa312971c31d0daa434a9f6cc12a43b8a190b44)

Branding and app identity: Backfill changed-file lists for historical Juno commits. This changed 1 file(s): project-tracker.csv.

- Commit: 7fa3129 | Files changed: 1 | Lines: +10 / -10
- Changed files: project-tracker.csv
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:32:00 IST — [Update tracker report with file-stat backfill progress](https://github.com/jananisr2020/Threadly/commit/f3d9b8b2a269fb3610a8291df53db99ac17b42e7)

Project maintenance: Update tracker report with file-stat backfill progress. This changed 1 file(s): PROJECT_TRACKER.md.

- Commit: f3d9b8b | Files changed: 1 | Lines: +1 / -1
- Changed files: PROJECT_TRACKER.md
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:38:30 IST — [Add readable automated Juno tracker generator](https://github.com/jananisr2020/Threadly/commit/24148e68542ac5e12bf67842bb28b1972bfd58e1)

Branding and app identity: Add readable automated Juno tracker generator. This changed 1 file(s): scripts/update_project_tracker.py.

- Commit: 24148e6 | Files changed: 1 | Lines: +160 / -0
- Changed files: scripts/update_project_tracker.py
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:38:33 IST — [Automate tracker refresh on main pushes](https://github.com/jananisr2020/Threadly/commit/69e461f0f81126e00258e28181f0f8bcd6da9ed3)

Project maintenance: Automate tracker refresh on main pushes. This changed 1 file(s): .github/workflows/project-tracker.yml.

- Commit: 69e461f | Files changed: 1 | Lines: +41 / -0
- Changed files: .github/workflows/project-tracker.yml
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:38:41 IST — [Refresh project tracker and timeline](https://github.com/jananisr2020/Threadly/commit/035486f853798da86854df82d36ba43892087367)

Project maintenance: Refresh project tracker and timeline. This changed 2 file(s): PROJECT_TRACKER.md, project-tracker.csv.

- Commit: 035486f | Files changed: 2 | Lines: +1783 / -194
- Changed files: PROJECT_TRACKER.md, project-tracker.csv
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

#### 21:49:38 IST — [Add automated checkout regression tests](https://github.com/jananisr2020/Threadly/commit/59705c4ff5e08b196bd216b72e7a9346e4658451)

Checkout and orders: Add automated checkout regression tests. This changed 3 file(s): .github/workflows/checkout-tests.yml, threadly-v2/package.json, threadly-v2/scripts/test-checkout.js.

- Commit: 59705c4 | Files changed: 3 | Lines: +112 / -1
- Changed files: .github/workflows/checkout-tests.yml, threadly-v2/package.json, threadly-v2/scripts/test-checkout.js
- Test status: not inferred from the commit; inspect CI.
- Deployment status: not inferred from the commit; verify Netlify.

## Workstream guide

| Area | What it covers |
|---|---|
| Branding and app identity | Threadly-to-Juno naming, icons, PWA and Android identity. |
| Catalogue and products | Product data, category navigation, catalogue recovery, galleries and prices. |
| Seller marketplace | Seller application, listings, seller orders and ledger foundations. |
| Checkout and orders | Cart, coupons, COD removal, stock validation, payment callbacks and reconciliation. |
| Installable app | PWA and Android build/install support. |
| Documentation and validation | Setup guides, architecture, deployment guidance and checks. |

## Follow-up cautions

- Review checkout and inventory reconciliation with real tests before production.
- Google Sheets writes across separate tabs are not atomic; partial stock updates may need manual reconciliation.
- Seller login, Sheets permissions, live checkout and Netlify settings require environment-level verification.
- Before repeating a fix, inspect its history entry, commit diff, CI result and deployed build.
