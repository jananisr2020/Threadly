#!/usr/bin/env python3
"""Generate five AI gallery views per product in Juno's catalogue.

Reads threadly-v2/public/catalog.json, uses each product's current image URL as
a reference, and saves generated PNGs locally with a resumable manifest.
It does not overwrite the production catalogue or upload images to a host.
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

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "public" / "catalog.json"
DEFAULT_OUTPUT = ROOT / "generated_product_views"
VIEWS = {
    "front": "Create a clean front-facing hero product photograph.",
    "side": "Create a clear side or alternate-angle product photograph.",
    "back": "Create a clear rear, reverse, or underside view, whichever is meaningful for this item.",
    "detail": "Create a close-up showing material, texture, finish, stitching, clasp, or other real product details.",
    "model": "Create a tasteful ecommerce lifestyle photograph showing this exact item in use. For wearable items, show it on an adult model; for non-wearable items, show a suitable lifestyle or scale context.",
}

def safe_name(value: Any) -> str:
    text = re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "item")).strip("-._")
    return text[:100] or "item"

def load_catalog(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data.get("products"), list):
        raise ValueError(f"{path} does not contain a products list")
    return data

def source_url(product: dict[str, Any]) -> str:
    images = product.get("images")
    candidates = list(images) if isinstance(images, list) else []
    candidates.extend([product.get("img")])
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.startswith(("https://", "http://")):
            return candidate
    raise ValueError("no HTTP(S) source image URL")

def download_source(url: str, timeout: int = 45) -> tuple[bytes, str]:
    response = requests.get(url, timeout=timeout, headers={"User-Agent": "JunoProductStudio/1.0"})
    response.raise_for_status()
    content_type = response.headers.get("content-type", "").split(";")[0].lower()
    extension = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }.get(content_type)
    if not extension:
        extension = Path(urlparse(response.url).path).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise ValueError(f"source URL did not return a supported image (content-type: {content_type or 'unknown'})")
    if len(response.content) > 20 * 1024 * 1024:
        raise ValueError("source image is larger than 20 MB")
    return response.content, extension

def generate_image(
    api_key: str,
    image_bytes: bytes,
    extension: str,
    product: dict[str, Any],
    view: str,
    model: str,
    timeout: int,
) -> bytes:
    name = str(product.get("name") or product.get("id") or "product")
    category = str(product.get("cat") or product.get("category") or "fashion accessory")
    color = str(product.get("col") or "")
    prompt = (
        f"Create one premium ecommerce product photograph for Juno. Product name: {name}. "
        f"Category: {category}. Listed colour metadata: {color or 'not specified'}. "
        "Use the uploaded image as the primary visual reference. Preserve the same product identity, "
        "recognisable shape, colour, pattern, material, hardware, and design. Do not add logos, text, "
        "watermarks, extra products, or invented decorations. Use realistic lighting, a clean neutral "
        "studio background, accurate proportions, and a sharp commercial product-photography finish. "
        f"Requested view: {VIEWS[view]} If the reference is generic, unclear, or does not depict the "
        "named product accurately, do not invent specific construction details; make the closest faithful "
        "view possible. One image only."
    )
    extension = ".jpg" if extension == ".jpeg" else extension
    files = {"image": (f"reference{extension}", image_bytes, {
        ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"
    }[extension])}
    response = requests.post(
        "https://api.openai.com/v1/images/edits",
        headers={"Authorization": f"Bearer {api_key}"},
        data={"model": model, "prompt": prompt, "size": "1024x1024", "n": "1"},
        files=files,
        timeout=timeout,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI API {response.status_code}: {response.text[:1200]}")
    payload = response.json()
    encoded = payload.get("data", [{}])[0].get("b64_json")
    if not encoded:
        raise RuntimeError("OpenAI response did not contain data[0].b64_json")
    return base64.b64decode(encoded)

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=0, help="process only the first N products (use 1 for a test)")
    parser.add_argument("--product-id", help="process one exact product ID, e.g. JN0001")
    parser.add_argument("--views", nargs="+", choices=list(VIEWS), default=list(VIEWS), help="views to generate")
    parser.add_argument("--model", default=os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1"))
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=240)
    parser.add_argument("--retry-failed", action="store_true", help="retry views marked failed in the manifest")
    args = parser.parse_args()

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: set OPENAI_API_KEY in your environment; do not put it in this script.", file=sys.stderr)
        return 2
    catalog = load_catalog(args.catalog)
    products = catalog["products"]
    if args.product_id:
        products = [p for p in products if str(p.get("id")) == args.product_id]
        if not products:
            print(f"ERROR: product ID {args.product_id!r} was not found.", file=sys.stderr)
            return 2
    elif args.limit > 0:
        products = products[:args.limit]

    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {"catalog": str(args.catalog), "model": args.model, "products": {}}

    total = len(products) * len(args.views)
    completed = 0
    print(f"Products selected: {len(products)} | views per product: {len(args.views)} | max new images: {total}")
    print(f"Output directory: {args.output.resolve()}")
    print("Each view is a separate API request and may incur API charges.")

    for index, product in enumerate(products, start=1):
        product_id = safe_name(product.get("id") or f"product-{index}")
        product_name = str(product.get("name") or product_id)
        product_dir = args.output / product_id
        product_dir.mkdir(parents=True, exist_ok=True)
        record = manifest["products"].setdefault(product_id, {
            "id": product.get("id"), "name": product_name, "category": product.get("cat"),
            "source_url": None, "views": {}
        })
        print(f"\n[{index}/{len(products)}] {product_id} — {product_name}")
        try:
            url = source_url(product)
            record["source_url"] = url
            source_bytes, extension = download_source(url, timeout=45)
        except Exception as exc:
            print(f"  SOURCE ERROR: {exc}")
            for view in args.views:
                record["views"].setdefault(view, {"status": "failed", "error": f"source: {exc}"})
            manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
            continue

        for view in args.views:
            output_file = product_dir / f"{view}.png"
            existing = record["views"].get(view, {})
            if output_file.exists() and output_file.stat().st_size > 0 and not args.retry_failed:
                existing.update({"status": "done", "file": str(output_file.relative_to(args.output))})
                record["views"][view] = existing
                completed += 1
                print(f"  SKIP {view}: already exists")
                continue
            if existing.get("status") == "failed" and not args.retry_failed and not output_file.exists():
                # A failed view is retried by default so interrupted runs can recover.
                pass
            error = None
            for attempt in range(1, args.retries + 1):
                try:
                    image_bytes = generate_image(
                        api_key, source_bytes, extension, product, view, args.model, args.timeout
                    )
                    output_file.write_bytes(image_bytes)
                    record["views"][view] = {
                        "status": "done", "file": str(output_file.relative_to(args.output)),
                        "bytes": len(image_bytes), "model": args.model
                    }
                    print(f"  OK   {view}: {output_file}")
                    error = None
                    break
                except Exception as exc:
                    error = str(exc)
                    print(f"  RETRY {view} ({attempt}/{args.retries}): {error[:240]}")
                    if attempt < args.retries:
                        time.sleep(min(2 ** attempt, 20))
            if error:
                record["views"][view] = {"status": "failed", "error": error[:1500], "model": args.model}
                print(f"  FAIL {view}: {error[:240]}")
            completed += 1
            manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    manifest["summary"] = {
        "products_selected": len(products),
        "views_requested_per_product": args.views,
        "finished_at_unix": int(time.time()),
        "done_views": sum(
            1 for p in manifest["products"].values()
            for v in p.get("views", {}).values() if v.get("status") == "done"
        ),
        "failed_views": sum(
            1 for p in manifest["products"].values()
            for v in p.get("views", {}).values() if v.get("status") == "failed"
        ),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print("\nRun summary:")
    print(json.dumps(manifest["summary"], indent=2))
    print(f"Manifest: {manifest_path.resolve()}")
    print("Generated images are local files; they are not uploaded or published automatically.")
    return 0 if manifest["summary"]["failed_views"] == 0 else 1

if __name__ == "__main__":
    raise SystemExit(main())
