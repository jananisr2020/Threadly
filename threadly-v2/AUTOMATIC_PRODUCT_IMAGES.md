# Automatic Juno product image population

The scheduled Netlify function product-image-sync checks the existing Google Sheets Products tab every five minutes and quickly dispatches work to product-image-sync-background. The background function selects the first published product with a missing gallery slot, generates one view, uploads it to Cloudinary, and writes the permanent HTTPS URL and status back into that product row. It resumes from saved sheet data and does not intentionally regenerate filled slots.

## One-time Netlify environment variables

Keep credentials in Netlify Site configuration → Environment variables. Never commit secrets.

Existing: SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY.

Add: HF_TOKEN, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, JUNO_IMAGE_SYNC_TOKEN (a long random secret shared by the scheduler and background worker).

Optional: HF_IMAGE_MODEL (defaults to black-forest-labs/FLUX.1-schnell). The generator uses the open-weight FLUX.1-schnell model through Hugging Face Inference Providers; FLUX.1-schnell is released under Apache-2.0. Hugging Face inference availability/rate limits may depend on your account and provider. This is hosted inference, not a model running on Netlify. Cloudinary remains the image-hosting destination.

The Google service account must have Editor access to the spreadsheet. Cloudinary credentials must permit uploads.

## Product database behaviour

The worker preserves existing columns and adds Image, Image 2, Image 3, Image 4, Image 5, Image Status, and Image Updated if absent. Generated images use text-to-image prompts; the worker does not pass source photos to the model, so results are illustrative rather than exact SKU reproductions. It only uses the current primary image as a visual reference if the URL appears to be a real image; loremflickr category preview images are not treated as trustworthy source photos. Generated images are hosted in Cloudinary and their HTTPS URLs are saved to the same Products row. The current storefront CSV loader reads Image and Image 2–5 into product galleries.

New products added manually to Products are picked up within about five minutes, provided Product ID and Product Name are present and Show on Site is not set to No. If the Show on Site column is absent, products are processed by default.

## Existing catalogue backlog

The worker processes one missing gallery image per five-minute run. Five views for 604 products can require up to 3,020 image generations. Hugging Face inference can have provider/rate-limit constraints, and Cloudinary hosting has its own plan limits; processing is incremental and resumable. Where no trustworthy product photo exists, the generated image is illustrative based on the product name/category, not a verified supplier/SKU photo. Use supplier-approved photos before promising exact product colour/material.

## Verify after deployment

1. Add the required environment variables in Netlify and redeploy.
2. Inspect Netlify Functions logs for product-image-sync and product-image-sync-background.
3. Check the Products sheet for image URLs and Image Status.
4. Open product detail pages and verify the five gallery images.
