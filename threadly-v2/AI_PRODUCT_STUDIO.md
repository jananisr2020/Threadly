# Juno AI Product Studio

## Local image generation + database update

The existing Python workflow is `scripts/generate_product_views.py`. It now supports generating five separate views per product, resuming from existing files, and writing the resulting image references into the Juno JSON catalogue and an XLSX workbook.

### 1. Install dependencies (Windows PowerShell)

From the repository's `threadly-v2` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-image-generation.txt
```

Create `.env` inside `threadly-v2`:

```text
OPENAI_API_KEY=your_real_openai_api_key
OPENAI_IMAGE_MODEL=gpt-image-1
```

Keep `.env` private. Never commit it or place the API key in frontend code.

### 2. Test with one product first

```powershell
python scripts/generate_product_views.py --product-id JN0001 --views front side detail
```

The generated PNGs and resumable manifest are saved under `public/generated_product_views/JN0001/`. Check your OpenAI API account has image-generation access and billing enabled. Each view is a separate paid API request.

### 3. Write image paths into the site catalogue

After reviewing the generated files, run:

```powershell
python scripts/generate_product_views.py --product-id JN0001 --views front side detail --update-catalog
```

The script updates `public/catalog.json` for successfully generated views only. The paths point to files under `public/generated_product_views`, so they can be served by the site after those image files and the updated catalogue are committed and deployed. Failed views retain their existing references.

To process the first two products (up to 10 image requests):

```powershell
python scripts/generate_product_views.py --limit 2 --update-catalog
```

To process all catalogue products (604 × 5 = up to 3,020 image requests):

```powershell
python scripts/generate_product_views.py --update-catalog
```

Do not start the full run until a small batch has been reviewed and the expected API cost is acceptable.

### 4. Update an existing XLSX database

The workbook is updated by matching its product-ID column against catalogue product IDs. Existing workbook cells/columns are preserved; five image URL columns are updated or added. An updated copy is created, leaving the original untouched.

```powershell
python scripts/generate_product_views.py --product-id JN0001 --views front side detail --xlsx "C:\path\to\Threadly_Database.xlsx"
```

The default output is `Threadly_Database_Updated.xlsx` beside the original. To choose another path, use `--xlsx-output "C:\path\to\Juno_Database_Updated.xlsx"`. Install `openpyxl` as shown above. The workbook needs a header such as `ID`, `Product ID`, `SKU`, or `Product SKU` with values matching the catalogue IDs (for example `JN0001`).

For XLSX-only use, the script writes generated local file paths when the output is outside the site's public directory. For deployable web image paths, keep the default output under `public/generated_product_views` and use `--update-catalog`.

### What is and is not automatic

- **Local:** image generation, resumable manifest, catalogue JSON edits, and XLSX copy updates are handled by the script.
- **Not automatic:** the script does not write to Google Sheets, upload to cloud image storage, push commits to GitHub, or deploy to Netlify. To publish locally generated assets, commit the generated PNGs and updated catalogue, then deploy the repository.
- **Product accuracy:** the current catalogue contains category-search preview imagery, not necessarily exact supplier-SKU photos. AI may change product details. Review every generated image against the actual product before publishing or accepting orders.

## Netlify admin studio

The existing `public/admin-product-studio.html` and `netlify/functions/ai-product-views.js` provide a separate one-product-at-a-time browser studio. Configure these Netlify environment variables:

- `OPENAI_API_KEY`
- `JUNO_AI_STUDIO_TOKEN`
- `OPENAI_IMAGE_MODEL` (optional; defaults to `gpt-image-1`)

Redeploy after changing environment variables. Open `/admin-product-studio.html` and enter the studio token. The Netlify function returns candidate images for review; it does not write generated images into the catalogue or XLSX. Use the local Python workflow above for batch generation and database-file updates.

Never place the API key in HTML, browser storage, or source control.
