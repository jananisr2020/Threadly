# Juno: local open-weight image generation and Google Sheets sync

Juno uses the open-weight `stabilityai/sdxl-turbo` model through Python Diffusers. Image generation runs on a computer you control; it does not call a paid image-generation API or require an OpenAI/Hugging Face inference API token. The model weights are downloaded once from Hugging Face, so the first setup needs internet access.

## What runs where

- **Netlify:** hosts the storefront and serves the static image files after a Git deployment.
- **Local image worker:** reads the Google Sheets `Products` tab, generates missing five-view galleries, writes the files into the repo, pushes the files and catalogue to the connected Git branch, and then writes the public Netlify image URLs back into the sheet.
- **Automatic deploy:** if Netlify is connected to that GitHub branch with deploys enabled, each successful push should trigger a normal Netlify deploy.
- **Not a Netlify model:** Netlify does not run Diffusers/SDXL Turbo automatically. The local worker must be running on a powered-on computer with model dependencies, Google Sheets access, and Git push access. If the worker is stopped or the computer is off, new sheet rows wait until it runs again.

## Requirements

- Python 3.10 or 3.11
- NVIDIA GPU with preferably 8 GB+ VRAM recommended; CPU generation is possible but very slow for thousands of images.
- Google service-account credentials with edit access to the spreadsheet, stored as environment variables (these are Google Sheets credentials, not image-model API keys).
- A local Git checkout authenticated to push to the repository's deployment branch.
- A Netlify site URL and Netlify connected to the same Git branch.

## Windows PowerShell setup

Open PowerShell in the repository's `threadly-v2` folder:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-local-image-generation.txt
```

Set these environment variables in the same PowerShell session (use your actual values; do not commit secrets to Git):

```powershell
$env:SHEET_ID = "your_google_spreadsheet_id"
$env:GOOGLE_SERVICE_ACCOUNT_EMAIL = "your-service-account@your-project.iam.gserviceaccount.com"
$env:GOOGLE_PRIVATE_KEY = "your service account private key, with newlines preserved or represented as \\n"
$env:JUNO_SITE_URL = "https://your-live-site.netlify.app"
```

Make sure the Google service-account email is shared on the spreadsheet with Editor permission. The local Git checkout must already be authenticated for `git push`. Do not paste secrets into chat or commit them.

## Test safely first

The worker creates images and pushes generated files to GitHub. Test with a separate test sheet or a test branch/site before enabling it on your live Products tab.

```powershell
python scripts/sync_sheet_product_images.py --once
```

If that succeeds and the generated output is correct, keep it running to poll for new or incomplete product galleries every 10 minutes:

```powershell
python scripts/sync_sheet_product_images.py
```

To check more frequently, use `--interval 300` (5 minutes). The worker processes missing/incomplete products sequentially; generating 5 images can take a while. It is resumable because already-generated local view files are kept by the generator. Do not run multiple workers against the same checkout at once.

## Existing catalogue-only generator

To generate one product without syncing Sheets or pushing to GitHub:

```powershell
python scripts/generate_product_views_local.py --product-id JN0001
```

Generated images are saved under `public/products/generated/<product-id>/`. The script updates `public/catalog.json`.

## Important limitations

- **A Netlify deploy alone does not run image generation.** Netlify serves images that the local worker has already generated and pushed.
- **No image-model API key is needed**, but Google Sheets editing still requires Google service-account credentials and publishing requires authenticated Git push access.
- A model cannot guarantee that a generated image exactly matches a supplier SKU, material, pattern, or colour. Without a trustworthy source photo, output is illustrative and must be reviewed before use in a real store.
- Five images × 604 products means 3,020 images. Do not start the full catalogue without first reviewing one product's output and checking disk space, generation speed, image quality, and Netlify deploy size.
- The worker publishes to the Git branch configured in your checkout. Confirm that this is the branch connected to your Netlify site before running it on production data.
