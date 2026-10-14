# Juno AI Product Studio

A first integrated admin utility for generating multiple candidate gallery views from one uploaded product photo.

## What it does

- Upload one PNG/JPG/WebP product photo (up to 12 MB).
- Generate selected front/hero, alternate-angle, rear, detail and model/lifestyle candidates using an image-editing model.
- Review and download each output separately, plus export a JSON manifest.
- Keeps the provider API key server-side and protects the function with a dedicated studio token.
- Does **not** automatically publish generated images or write them to the product database. Human review and persistent image storage are required before catalog updates.

## Netlify setup

Add these environment variables in Netlify Site configuration → Environment variables:

- `OPENAI_API_KEY`: API key with image-generation access.
- `JUNO_AI_STUDIO_TOKEN`: long random secret used only for this studio.
- `OPENAI_IMAGE_MODEL` (optional): defaults to `gpt-image-1`.

Redeploy the site after setting variables. Open `/admin-product-studio.html` on the deployed site and enter the studio token. The function endpoint is `/.netlify/functions/ai-product-views`.

Never put the provider API key in HTML, source control, or browser storage. The access token is sent only in the request header; the page does not persist it.

## Important accuracy warning

Image editing models can alter product details even when instructed not to. Compare every output to the original for exact color, silhouette, print, quantity, material, stitching, clasps and branding. Do not use an invented back view or a synthetic model view as proof of the actual product. Keep the original image as the primary image until a generated alternative has been checked.

## Next integration step

After choosing persistent image storage (for example, an approved object-storage bucket) and deciding the product image fields in the live Google Sheets catalogue, connect approved outputs to the existing product update flow. This first slice deliberately does not store large base64 images in Google Sheets or commit product imagery to Git.
