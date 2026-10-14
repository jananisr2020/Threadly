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
