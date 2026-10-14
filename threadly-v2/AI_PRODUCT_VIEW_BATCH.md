# Juno AI Product View Batch Generator

This batch tool reads the existing catalogue at \`public/catalog.json\` (currently 604 product records) and generates requested gallery views using each product's current image URL as a reference.

## Important before a full run

- The catalogue's current image URLs are category-matched preview imagery, not verified supplier/SKU photos. AI-generated results cannot correct a wrong source image; review each product and replace preview sources with supplier-approved photos before accepting orders.
- One API request is made per product per view. Five views for 604 products can mean up to 3,020 image-generation requests and API charges. Do not run the full batch until a one-product test has been reviewed.
- Images and the manifest are saved to a local folder. This script does not upload images, alter the production catalogue, update Google Sheets, or deploy the site.
- Use only a valid API key in an environment variable. Never commit secrets to GitHub or paste them into chat.

## Setup (Windows PowerShell)

Run from the \`threadly-v2\` directory:

\`\`\`powershell
py -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
py -m pip install -r requirements-ai-product-studio.txt
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"
\`\`\`

## Test one product first

\`\`\`powershell
py .\\scripts\\generate_product_views.py --product-id JN0001
\`\`\`

This requests the five default views: \`front\`, \`side\`, \`back\`, \`detail\`, and \`model\`. It writes files under \`generated_product_views/JN0001/\` and records progress in \`generated_product_views/manifest.json\`.

You can test only one view to limit the test cost:

\`\`\`powershell
py .\\scripts\\generate_product_views.py --product-id JN0001 --views front
\`\`\`

## Run a small batch

\`\`\`powershell
py .\\scripts\\generate_product_views.py --limit 3
\`\`\`

The script resumes by skipping output PNG files that already exist. Failed requests are recorded in the manifest and can be retried by rerunning the command.

## Full batch (only after approval of test output)

\`\`\`powershell
py .\\scripts\\generate_product_views.py
\`\`\`

You can change the output folder with \`--output PATH\`, the model with \`--model MODEL_NAME\`, or the requested views with \`--views front detail model\`.

## Output layout

\`\`\`text
generated_product_views/
  manifest.json
  JN0001/
    front.png
    side.png
    back.png
    detail.png
    model.png
\`\`\`

The manifest tracks product IDs, source URL, output paths, status, model, and errors. Keep the output directory backed up. The generated images are not automatically included in Git or the live website. Before production integration, upload approved images to permanent image storage, then update the catalogue's \`images\` URLs through a reviewed import step.


## Automatic Google Sheet → website image pipeline

The Netlify image automation uses the Google Sheet Products tab as the source of truth. It adds these columns to the end of the existing header row if they are missing:

- AI Image 1 through AI Image 5
- AI Images Status
- AI Images Updated

When a product row has a Product ID, Product Name, and an HTTP(S) source image in the Image/Image URL column, the scheduled queue selects it automatically. The background worker generates front, side, back, detail, and model/lifestyle views, saves PNGs to persistent Netlify Blobs storage, and writes the resulting image URLs back to that product row. The storefront reads those columns from the live Products CSV endpoint and displays the generated five-image gallery. New products added through the admin form or directly to the Products sheet are picked up automatically by the same queue.

### Required Netlify environment variables

In addition to the existing Google Sheets variables, configure:

- OPENAI_API_KEY — an OpenAI API key with image-generation access
- JUNO_IMAGE_WORKER_TOKEN — a long, random secret shared only by the scheduler and background worker
- OPENAI_IMAGE_MODEL — optional; defaults to gpt-image-1

Netlify Blobs is used for image files, so the generated binary images are not committed to GitHub. The scheduler checks the sheet every minute and starts one product job at a time. Generation requires five image API calls per product and can incur charges. Failed jobs are held for six hours before automatic retry.

### Rollout and first test

1. Deploy the feature branch to a preview or merge it to the production branch.
2. Add the required environment variables in Netlify and trigger a new deploy.
3. Confirm the Products tab contains valid source image URLs.
4. Watch AI Images Status and AI Images Updated on the sheet. Each product progresses through Queued, Processing, then Complete; errors are written as Failed: ...
5. Verify one product's five images on the storefront before allowing the queue to process the full catalogue.

**Data quality note:** AI generation can only use the image supplied for that product. If existing source URLs are category-search previews rather than exact supplier product photos, generated views may not faithfully match the item. Replace those source URLs with verified product photos before accepting orders.
