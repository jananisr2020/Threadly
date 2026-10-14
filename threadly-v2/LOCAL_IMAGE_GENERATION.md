# Juno: local image generation without API keys

This route runs an open-weight image model on your own computer. It does **not** call OpenAI or Hugging Face hosted inference and does not need an API token. On first run it downloads public model weights from Hugging Face; generation then runs locally.

## Requirements

- Python 3.10 or 3.11
- Preferably an NVIDIA GPU with 8 GB+ VRAM; SDXL Turbo can be very slow on CPU and may need memory tuning on smaller GPUs.
- Internet for the initial model download and any source images.

## Windows PowerShell

From the repository's `threadly-v2` folder:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-local-image-generation.txt
python scripts/generate_product_views_local.py --product-id JN0001
```

Inspect the five generated images under `public/products/generated/JN0001` and the updated `public/catalog.json`. If the test looks good, run the rest in batches:

```powershell
python scripts/generate_product_views_local.py --limit 20
python scripts/generate_product_views_local.py
```

The script is resumable: existing view files are kept unless `--force` is supplied. It writes images and updates the catalogue incrementally, so interrupted runs can resume. Use `--device cpu` to force CPU or `--device cuda` to force NVIDIA CUDA.

## Important limitations

- The model is open-weight (`stabilityai/sdxl-turbo`); the model's own license and usage terms still apply.
- A text-to-image model cannot guarantee that generated images match an exact SKU, colour, fabric, or supplier. Category preview URLs such as loremflickr are deliberately not used as identity references.
- The generated assets are written locally; they are **not** uploaded to GitHub/Netlify automatically. To publish, commit/push the generated folder and updated catalogue, or upload assets to your own image host. Thousands of images can make a Git repository and deploy very large; start with one product and inspect quality before running the full 604-product catalogue.
- This local route does not need model API keys. It does not magically run while your computer is off; new products need the script run again (or a local scheduled task).
