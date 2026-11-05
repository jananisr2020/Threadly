# Juno catalogue review — 14 October 2026

## Current baseline

Audited from `public/catalog.json` on the `juno/catalogue-audit-2026-10` review branch.

- **604 products** and **23 categories** are present.
- Every product currently has five gallery URLs plus a separate primary-image URL.
- Product IDs are unique, product names are unique in the current catalogue, and the selling price does not exceed MRP in the audited records.
- Audience/group counts: Women 417, Unisex 162, Kids 25.
- The catalogue has 3,624 distinct URL strings across primary and gallery image fields.
- All 3,624 URLs use `loremflickr.com`. Different URLs/lock values do **not** prove the returned photo is the exact item, colour, pack size, or model-wearing view.

## Important image limitation

The catalogue has five URLs per product, but it does **not** yet have five verified, SKU-matched photos per product. The current URLs are category-search preview images. This explains why photos can look repetitive or mismatched even when the URLs are different.

Do not describe these preview URLs as supplier-approved product photography. Before accepting real orders, replace them with owned/supplier-approved assets and check each image against the item title, colour, pack quantity, and variant. Model-wearing images should only be used when they actually show the relevant product and the store has permission to use them.

## Category organization

The catalogue currently mixes fashion accessories with stationery, toys, home/kitchen, drinkware, and tech accessories. This is valid for a broad budget marketplace, but the storefront should group the navigation into clear top-level departments rather than presenting all 23 categories as an unstructured list.

Suggested top-level navigation:

1. **Women** — clothing, footwear, bags, jewellery, beauty and hair accessories.
2. **Men** — clothing, footwear, wallets, watches and accessories (only show departments with real products).
3. **Kids** — kids' accessories, toys and stationery.
4. **Bags & Accessories** — bags, charms, eyewear, watches, small wearables and organisers.
5. **Beauty** — makeup, nail and beauty accessories.
6. **Home & Lifestyle** — home/kitchen, drinkware, lunch, travel and storage.
7. **Stationery & Tech** — stationery, desk and tech accessories.
8. **Gifts & Sets** — curated bundles and occasion gifts.

This is a navigation proposal, not a claim that the catalogue already contains full clothing and footwear ranges.

## Next implementation steps

- [x] Establish a reproducible offline catalogue audit.
- [x] Record the image mismatch risk and category grouping proposal.
- [ ] Reorganize homepage departments and category navigation in a reviewable UI change.
- [ ] Replace category-search imagery with verified product-specific image assets.
- [ ] Check image loading/fallback behaviour and mobile product-gallery thumbnails.
- [ ] Verify catalogue changes against the live store before any production deployment.

## Run the audit

From the `threadly-v2` directory:

```bash
node scripts/audit-catalog.js
```

The audit checks structure and URL uniqueness; it does not download images or confirm what a remote URL actually displays.
