# Juno Product Tracker & Inventory Report

- Repository: [jananisr2020/Threadly](https://github.com/jananisr2020/Threadly)
- Primary catalogue tracked: threadly-v2/public/catalog.json
- Last generated: 2026-10-19 22:54:07 IST
- Current catalogue product records: **604**
- Current stock units recorded in catalogue: **17049**
- In stock: **604** product records | Low stock (1–5): **0** | Out of stock: **0** | Unknown stock: **0**
- Files: [product-inventory.csv](./product-inventory.csv) · [product-tracker.csv](./product-tracker.csv) · [product-daily-summary.csv](./product-daily-summary.csv)

## How this tracker works

GitHub Actions rebuilds these files from the catalogue Git history on pushes to main. A product is counted as added only when its ID first appears in the committed primary catalogue. Stock and detail edits are logged separately; deleted IDs are recorded as removed.

Important scope: counts describe committed catalog.json, not a live Google Sheets query or warehouse count. The repository cannot infer products proposed but never submitted to the catalogue. Daily summary rows explicitly mark updates where no new product IDs were added. The legacy products.csv is not merged into these totals to avoid double-counting a separate catalogue.

## Daily product changes (India time)

| Date | Added | Removed | Stock changed | Details updated | What was not added |
|---|---:|---:|---:|---:|---|
| 2026-10-19 | 0 | 0 | 0 | 603 | No new product IDs in this update |
| 2026-10-14 | 0 | 0 | 0 | 604 | No new product IDs in this update |
| 2026-10-13 | 0 | 0 | 0 | 604 | No new product IDs in this update |
| 2026-10-13 | 100 | 0 | 0 | 0 | — |
| 2026-10-13 | 0 | 0 | 0 | 504 | No new product IDs in this update |
| 2026-10-13 | 432 | 0 | 0 | 0 | — |
| 2026-10-13 | 72 | 56 | 0 | 0 | — |
| 2026-10-12 | 56 | 0 | 0 | 0 | — |

## Inventory rules

- LOW STOCK means 1–5 units; OUT OF STOCK means 0; blank or non-numeric stock is UNKNOWN.
- Inventory CSV lists each current product ID once with its latest committed name, category, price and stock.
- Products added means new product IDs, not image-generation attempts or edits to existing products.

## Validation note

This is a repository tracker. Verify the live storefront and Google Sheets-backed inventory separately before treating these counts as fulfilment-ready stock.
