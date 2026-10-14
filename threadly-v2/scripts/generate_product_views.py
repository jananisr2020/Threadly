#!/usr/bin/env python3
"""Generate five product views and update Juno's local catalogue/workbook.

Run from threadly-v2. Generated images are written under public/generated_product_views
so their paths are deployable when the files are committed with the site. The script
never uploads images or changes the live Google Sheet/Netlify database.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "public" / "catalog.json"
DEFAULT_OUTPUT = ROOT / "public" / "generated_product_views"
VIEWS = {
    "front": "front-facing hero product photograph",
    "side": "side or alternate three-quarter angle",
    "back": "rear, reverse, or underside view when inferable; otherwise a conservative alternate angle",
    "detail": "close-up of a real visible material, texture, finish, stitching, clasp, or print detail",
    "model": "tasteful lifestyle photograph showing this same item worn or used; use a suitable context for non-wearable products",
}


def safe_name(value: Any) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "item")).strip("-._")[:100] or "item"


def load_catalog(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data.get("products"), list):
        raise ValueError(f"{path} does not contain a products list")
    return data


def source_url(product: dict[str, Any]) -> str:
    candidates = list(product.get("images", [])) if isinstance(product.get("images"), list) else []
    candidates.append(product.get("img"))
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.startswith(("https://", "http://")):
            return candidate
    raise ValueError("no HTTP(S) source image URL")


def download_source(url: str, timeout: int = 45) -> tuple[bytes, str]:
    response = requests.get(url, timeout=timeout, headers={"User-Agent": "JunoProductStudio/1.0"})
    response.raise_for_status()
    mime = response.headers.get("content-type", "").split(";")[0].lower()
    extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(mime)
    if not extension:
        extension = Path(urlparse(response.url).path).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise ValueError(f"unsupported source image type: {mime or 'unknown'}")
    if len(response.content) > 20 * 1024 * 1024:
        raise ValueError("source image exceeds 20 MB")
    return response.content, extension


def generate_image(api_key: str, image_bytes: bytes, extension: str,
                   product: dict[str, Any], view: str, model: str, timeout: int) -> bytes:
    name = str(product.get("name") or product.get("id") or "product")
    category = str(product.get("cat") or product.get("category") or "fashion accessory")
    colour = str(product.get("col") or "")
    prompt = (
        f"Create one premium Juno ecommerce photograph. Product name: {name}. "
        f"Category: {category}. Listed colour: {colour or 'not specified'}. "
        "Use the uploaded image as the primary visual reference. Preserve the same product identity, "
        "recognisable shape, colour, pattern, material, hardware, and included quantity. Do not add "
        "logos, text, watermarks, extra products, or invented decorations. Use realistic lighting, "
        "neutral studio styling, accurate proportions, and commercial product photography. "
        f"Requested view: {VIEWS[view]}. If the source does not reliably show a detail, do not invent it. "
        "One image only."
    )
    extension = ".jpg" if extension == ".jpeg" else extension
    mime = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}[extension]
    response = requests.post(
        "https://api.openai.com/v1/images/edits",
        headers={"Authorization": f"Bearer {api_key}"},
        data={"model": model, "prompt": prompt, "size": "1024x1024", "n": "1"},
        files={"image": (f"reference{extension}", image_bytes, mime)},
        timeout=timeout,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI API {response.status_code}: {response.text[:1000]}")
    encoded = response.json().get("data", [{}])[0].get("b64_json")
    if not encoded:
        raise RuntimeError("OpenAI response contained no image data")
    return base64.b64decode(encoded)



def generate_image_from_prompt(api_key: str, product: dict[str, Any], view: str, model: str, timeout: int) -> bytes:
    """Generate a fallback image from catalogue text when the remote reference image is unavailable."""
    name = str(product.get("name") or product.get("id") or "product")
    category = str(product.get("cat") or product.get("category") or "fashion accessory")
    colour = str(product.get("col") or "")
    prompt = (
        f"Create one premium Juno ecommerce product photograph for: {name}. "
        f"Category: {category}. Listed colour code: {colour or 'not specified'}. "
        "Create a plausible, simple product concept based on the product name and category. "
        "Use realistic proportions, clean neutral studio background, soft commercial lighting, "
        "and a polished budget-fashion ecommerce style. Do not add logos, text, watermarks, "
        "unlisted accessories, or extra products. This is a concept image because no reference "
        "photo was available; do not claim it is an exact supplier SKU. "
        f"Requested view: {VIEWS[view]}. One image only."
    )
    response = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"model": model, "prompt": prompt, "size": "1024x1024", "n": 1},
        timeout=timeout,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI API {response.status_code}: {response.text[:1000]}")
    encoded = response.json().get("data", [{}])[0].get("b64_json")
    if not encoded:
        raise RuntimeError("OpenAI response contained no image data")
    return base64.b64decode(encoded)

def update_workbook(path: Path, catalog_products: list[dict[str, Any]], output: Path) -> None:
    """Update workbook rows by product ID; preserve all existing columns and cell data."""
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise RuntimeError("Install openpyxl to update XLSX: python -m pip install openpyxl") from exc
    if not path.exists():
        raise FileNotFoundError(f"Workbook not found: {path}")
    workbook = load_workbook(path)
    updated = 0
    product_map = {str(p.get("id")): p for p in catalog_products if p.get("id") is not None}
    for sheet in workbook.worksheets:
        if sheet.max_row < 2:
            continue
        headers = {str(cell.value or "").strip().lower(): cell.column for cell in sheet[1]}
        id_col = next((headers[k] for k in ("id", "product id", "product_id", "sku", "product sku") if k in headers), None)
        if not id_col:
            continue
        image_cols: dict[int, int] = {}
        for col, cell in enumerate(sheet[1], start=1):
            key = str(cell.value or "").strip().lower()
            match = re.search(r"(?:image|img|photo)[ _-]*(?:url[ _-]*)?([1-5])(?:[ _-]*url)?$", key)
            if match:
                image_cols[int(match.group(1))] = col
        # If the workbook has no recognisable image columns, add five clearly named columns.
        if not image_cols:
            next_col = sheet.max_column + 1
            for n in range(1, 6):
                sheet.cell(1, next_col + n - 1, f"Image {n} URL")
                image_cols[n] = next_col + n - 1
        for row in range(2, sheet.max_row + 1):
            product = product_map.get(str(sheet.cell(row, id_col).value or "").strip())
            if not product:
                continue
            images = product.get("images", [])
            if not isinstance(images, list):
                continue
            for n, col in image_cols.items():
                if n <= len(images):
                    sheet.cell(row, col, images[n - 1])
            updated += 1
    if updated == 0:
        raise ValueError("No workbook rows matched catalogue product IDs. No XLSX was saved.")
    output.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output)
    print(f"Workbook updated: {output} (matched rows: {updated})")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=0, help="process first N products; use 1 for a test")
    parser.add_argument("--product-id", help="process one exact product ID, e.g. JN0001")
    parser.add_argument("--views", nargs="+", choices=list(VIEWS), default=list(VIEWS))
    parser.add_argument("--model", default=os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1"))
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=240)
    parser.add_argument("--update-catalog", action="store_true", help="write generated image paths into catalog.json")
    parser.add_argument("--xlsx", type=Path, help="existing workbook to update by product ID")
    parser.add_argument("--xlsx-output", type=Path, help="output workbook path (defaults to <name>_Updated.xlsx)")
    parser.add_argument("--retry-failed", action="store_true", help="regenerate views already marked failed")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY is not set. Put it in threadly-v2/.env; never commit .env.", file=sys.stderr)
        return 2
    catalog = load_catalog(args.catalog)
    all_products = catalog["products"]
    if args.product_id:
        selected = [p for p in all_products if str(p.get("id")) == args.product_id]
        if not selected:
            print(f"ERROR: product ID {args.product_id!r} was not found.", file=sys.stderr)
            return 2
    elif args.limit > 0:
        selected = all_products[:args.limit]
    else:
        selected = all_products

    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {
        "catalog": str(args.catalog), "model": args.model, "products": {}
    }
    print(f"Products selected: {len(selected)} | views per product: {len(args.views)} | max new images: {len(selected)*len(args.views)}")
    print(f"Images will be saved under: {args.output.resolve()} (each view is a paid API request)")

    for index, product in enumerate(selected, start=1):
        raw_id = str(product.get("id") or f"product-{index}")
        product_id = safe_name(raw_id)
        product_dir = args.output / product_id
        product_dir.mkdir(parents=True, exist_ok=True)
        record = manifest["products"].setdefault(product_id, {
            "id": raw_id, "name": str(product.get("name") or product_id), "views": {}
        })
        print(f"\n[{index}/{len(selected)}] {raw_id} — {product.get('name', product_id)}")
        source_bytes = None
        extension = None
        try:
            url = source_url(product)
            source_bytes, extension = download_source(url)
            record["source_url"] = url
            record.pop("source_error", None)
        except Exception as exc:
            # LoremFlickr or another remote source may be unavailable/unauthorized.
            # Continue with text-to-image generation so the batch can proceed.
            record["source_error"] = str(exc)
            print(f"  SOURCE UNAVAILABLE: {exc}")
            print("  Using text-only concept generation for this product; verify against the real SKU.")

        for view in args.views:
            output_file = product_dir / f"{view}.png"
            old = record["views"].get(view, {})
            if output_file.exists() and output_file.stat().st_size > 0 and not args.retry_failed:
                old.update({"status": "done", "file": str(output_file.relative_to(args.output)).replace("\\", "/")})
                record["views"][view] = old
                continue
            error = None
            for attempt in range(1, args.retries + 1):
                try:
                    image_bytes = (
                        generate_image(api_key, source_bytes, extension, product, view, args.model, args.timeout)
                        if source_bytes is not None and extension is not None
                        else generate_image_from_prompt(api_key, product, view, args.model, args.timeout)
                    )
                    output_file.write_bytes(image_bytes)
                    record["views"][view] = {
                        "status": "done", "file": str(output_file.relative_to(args.output)).replace("\\", "/"),
                        "bytes": output_file.stat().st_size, "model": args.model
                    }
                    print(f"  OK {view}: {output_file}")
                    error = None
                    break
                except Exception as exc:
                    error = str(exc)
                    print(f"  RETRY {view} ({attempt}/{args.retries}): {error[:200]}")
                    if attempt < args.retries:
                        time.sleep(min(2 ** attempt, 20))
            if error:
                record["views"][view] = {"status": "failed", "error": error[:1200], "model": args.model}
                print(f"  FAIL {view}: {error[:200]}")
            manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    # Build image references for selected products. Public-folder outputs become deployable site paths.
    output_is_public = args.output.resolve().is_relative_to((ROOT / "public").resolve())
    if args.update_catalog and not output_is_public:
        raise ValueError("--update-catalog requires --output inside threadly-v2/public so paths work on the deployed site.")
    for product in selected:
        record = manifest["products"].get(safe_name(product.get("id")))
        if not record:
            continue
        current = list(product.get("images", [])) if isinstance(product.get("images"), list) else []
        while len(current) < 5:
            current.append(product.get("img", ""))
        for i, view in enumerate(VIEWS):
            info = record.get("views", {}).get(view, {})
            generated_file = args.output / info.get("file", "")
            if info.get("status") == "done" and generated_file.is_file():
                if output_is_public:
                    rel = generated_file.resolve().relative_to((ROOT / "public").resolve()).as_posix()
                    current[i] = "/" + rel
                else:
                    current[i] = str(generated_file.resolve())
        product["images"] = current[:5]
        if current and current[0]:
            product["img"] = current[0]

    if args.update_catalog:
        catalog["source"] = "Juno catalogue with locally generated product gallery images; review generated images against the exact SKU before publishing."
        catalog["notice"] = "AI-generated candidate views. Verify every image matches the exact supplier SKU before accepting orders."
        args.catalog.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Catalogue updated: {args.catalog}")

    if args.xlsx:
        xlsx_output = args.xlsx_output or args.xlsx.with_name(args.xlsx.stem + "_Updated" + args.xlsx.suffix)
        update_workbook(args.xlsx, selected, xlsx_output)

    manifest["summary"] = {
        "products_selected": len(selected),
        "views_requested_per_product": args.views,
        "finished_at_unix": int(time.time()),
        "done_views": sum(1 for p in manifest["products"].values() for v in p.get("views", {}).values() if v.get("status") == "done"),
        "failed_views": sum(1 for p in manifest["products"].values() for v in p.get("views", {}).values() if v.get("status") == "failed"),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print("\nRun summary:")
    print(json.dumps(manifest["summary"], indent=2))
    print(f"Manifest: {manifest_path.resolve()}")
    if not args.update_catalog and not args.xlsx:
        print("Images generated locally; pass --update-catalog and/or --xlsx to write image references into databases.")
    return 0 if manifest["summary"]["failed_views"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
