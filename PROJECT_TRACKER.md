# Juno / Threadly Project Tracker

- **Repository:** https://github.com/jananisr2020/Threadly
- **Branch:** `main`
- **Tracker generated:** 2026-10-19 (IST, UTC+05:30)
- **History captured:** 163 GitHub commits
- **Commit-date range:** 2026-10-11T13:42:37Z through 2026-10-19T15:53:02Z
- **Main spreadsheet log:** [project-tracker.csv](./project-tracker.csv)

## What this tracker contains

The CSV contains one row per commit returned by GitHub's first two 100-commit history pages: UTC timestamp, converted India timestamp, full commit message, full and short SHA, clickable commit URL, and file-change details where fetched. GitHub history snapshot initially contained 163 project commits dated 2026-10-11 to 2026-10-19; the CSV now also lists the two bootstrap commits that created this tracker. Future tracker-maintenance commits will be captured on the next refresh. The earliest returned entry is the initial commit dated 2026-10-11.

**File-stat coverage:** GitHub history provides dates, messages and SHAs. Per-file stats were individually fetched for the 12 newest commits. Remaining rows are explicitly marked as needing file-stat backfill rather than guessing how many files changed. Open the linked commit for its authoritative file list and diff. This keeps the tracker honest and highlights what remains to fill in.

## Main workstreams / redundancy guard

| Workstream | History found | Don't repeat without checking |
|---|---|---|
| Initial code + deployment setup | Initial Threadly upload, PWA, Android shell, SEO foundations, Netlify monorepo configuration | Confirm current branch/site/deploy configuration before creating another app/site or duplicating workflows. |
| Threadly → Juno rebrand | Storefront, admin, policy/support pages, favicon, PWA cache/icons, Android label and icon | Inspect shared config and existing assets before doing another full branding sweep. |
| Checkout and payment safeguards | COD removal, cart/address UX, stock/quantity rules, payment recovery, checkout hardening, order IDs and reconciliation flags | COD is intentionally disabled. Razorpay was not replaced in the recent checkout hardening. Run regression tests before further checkout edits. |
| Catalogue / category UX | Catalogue recovery, category expansions, 18 category tiles, product filters, gallery support | Catalogue contains illustrative/sample data; do not describe it as verified supplier inventory. |
| Product imagery experiments | Image gallery support, downloader/generator experiments, cache updates, later removal/hiding of unsuitable imagery | Avoid reintroducing unrelated stock/placeholder photos or building another generator before reviewing previous attempts and user feedback. |
| Marketplace | Seller onboarding, studio, moderated products, seller orders and ledger foundations, Sheets tab creation/error improvements, homepage seller CTA | Seller payout/payment splitting is not implemented. Seller form/login and real Sheets permissions need real environment testing. |
| Pricing and coupons | Shared coupon logic, JUNO10, budget pricing in bundled and live Juno-owned catalogue rows, pricing documentation | Prices are estimates, not supplier quotes; keep seller-owned prices separate from Juno-owned normalization. |

## Status / verification notes

- A commit means code was pushed; it does **not** prove that Netlify deployed it or that the live app works.
- Latest stock reconciliation changes could not be syntax-checked in the current environment because a local source download failed due to network/DNS restrictions.
- No live Netlify deployment or full Razorpay + Google Sheets end-to-end test is claimed here.
- Google Sheets writes across Orders and Products are not transactional. A partial stock update can require manual reconciliation.
- Next backfill: fetch per-file counts, file paths, additions and deletions for older commits. Then use the commit history links to audit repeated/similar commits.

## Maintenance rule

Whenever we make and push a new repository change, append its commit date/time (UTC + IST), message, SHA/link, file count and changed paths, plus tests performed and deployment status. If a change was not tested or deployed, label it that way. Before starting similar work, check this log and the commit diff first.
