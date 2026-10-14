#!/usr/bin/env python3
"""Generate Juno catalogue gallery images locally with an open-weight SDXL Turbo model.

No OpenAI/Hugging Face inference API key is used. Public model weights are downloaded
once; generation runs on this computer. The catalogue is updated incrementally.
"""
from __future__ import annotations
import argparse, io, json, re, sys
from pathlib import Path

import requests
import torch
from PIL import Image, ImageOps
from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CATALOG = PUBLIC / "catalog.json"
OUT = PUBLIC / "products" / "generated"
MODEL_DEFAULT = "stabilityai/sdxl-turbo"
VIEWS = {
    "front": "front-facing ecommerce hero product photo, centered, full product visible",
    "side": "distinct side or alternate angle product photo, clearly different composition",
    "back": "rear, reverse, or underside product view, whichever is meaningful",
    "detail": "macro close-up of material, stitching, texture, finish, clasp, and product details",
    "lifestyle": "premium lifestyle ecommerce photo showing the item in realistic use; if wearable, show an adult model wearing it naturally",
}

def safe(value):
    return re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "item")).strip("-._")[:90] or "item"

def read_catalog(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data.get("products"), list):
        raise ValueError("catalog.json must contain a products list")
    return data

def write_catalog(path, data):
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)

def get_source(product):
    candidates = list(product.get("images", [])) if isinstance(product.get("images"), list) else []
    candidates.append(product.get("img"))
    for url in candidates:
        if not isinstance(url, str) or not url.startswith(("http://", "https://")):
            continue
        if "loremflickr.com" in url.lower():
            continue
        try:
            response = requests.get(url, timeout=20, headers={"User-Agent": "JunoLocalImageGenerator/1.0"})
            if not response.ok or not response.headers.get("content-type", "").startswith("image/") or len(response.content) > 15 * 1024 * 1024:
                continue
            with Image.open(io.BytesIO(response.content)) as image:
                return ImageOps.fit(image.convert("RGB"), (512, 768), method=Image.Resampling.LANCZOS)
        except Exception:
            continue
    return None

def load_pipeline(cls, model, dtype):
    kwargs = {"torch_dtype": dtype}
    if dtype == torch.float16:
        kwargs["variant"] = "fp16"
    return cls.from_pretrained(model, **kwargs)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--product-id", help="generate only one product, e.g. JN0001")
    parser.add_argument("--limit", type=int, default=0, help="limit to first N products")
    parser.add_argument("--views", nargs="+", choices=list(VIEWS), default=list(VIEWS))
    parser.add_argument("--model", default=MODEL_DEFAULT)
    parser.add_argument("--device", choices=["auto", "cuda", "mps", "cpu"], default="auto")
    parser.add_argument("--force", action="store_true", help="regenerate existing images")
    parser.add_argument("--catalog", type=Path, default=CATALOG)
    parser.add_argument("--output", type=Path, default=OUT)
    args = parser.parse_args()

    if args.device == "auto":
        device = "cuda" if torch.cuda.is_available() else ("mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu")
    else:
        device = args.device
    if device == "cuda" and not torch.cuda.is_available():
        parser.error("--device cuda requested but CUDA is unavailable")
    if device == "mps" and not (getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()):
        parser.error("--device mps requested but MPS is unavailable")

    public_root = PUBLIC.resolve()
    output_root = args.output.resolve()
    try:
        output_root.relative_to(public_root)
    except ValueError:
        parser.error("--output must be inside threadly-v2/public so generated images can be served by the website")

    dtype = torch.float16 if device in ("cuda", "mps") else torch.float32
    print(f"Model: {args.model} | device: {device} | no inference API key required")
    print("First run downloads model weights. CPU generation is possible but very slow; use a supported GPU for large batches.")

    try:
        text_pipe = load_pipeline(AutoPipelineForText2Image, args.model, dtype).to(device)
        image_pipe = load_pipeline(AutoPipelineForImage2Image, args.model, dtype).to(device)
    except Exception as exc:
        print(f"Could not load model {args.model}: {exc}", file=sys.stderr)
        return 2

    data = read_catalog(args.catalog)
    products = data["products"]
    if args.product_id:
        products = [product for product in products if str(product.get("id")) == args.product_id]
        if not products:
            print(f"Product ID not found: {args.product_id}", file=sys.stderr)
            return 2
    elif args.limit > 0:
        products = products[:args.limit]

    args.output.mkdir(parents=True, exist_ok=True)
    made = 0
    for product_index, product in enumerate(products, 1):
        product_id = safe(product.get("id") or f"product-{product_index}")
        name = str(product.get("name") or product_id)
        category = str(product.get("cat") or product.get("category") or "fashion accessories")
        print(f"\n[{product_index}/{len(products)}] {product_id} — {name}", flush=True)
        folder = args.output / product_id
        folder.mkdir(parents=True, exist_ok=True)
        source = get_source(product)

        images = product.get("images") if isinstance(product.get("images"), list) else []
        images = list(images)
        while len(images) < 5:
            images.append("")

        for view in args.views:
            dest = folder / f"{view}.jpg"
            rel = "/" + dest.resolve().relative_to(public_root).as_posix()
            if dest.exists() and not args.force:
                print(f"  keep {view}", flush=True)
            else:
                prompt = (
                    f"Photorealistic commercial ecommerce product photograph for Juno. Product name: {name}. "
                    f"Category: {category}. Listed colour: {product.get('col', 'not specified')}. "
                    f"Requested shot: {VIEWS[view]}. One product only, coherent plausible design, natural proportions, "
                    "soft studio light, pale neutral background, crisp focus, portrait 2:3 composition. "
                    "No text, letters, watermark, logo, collage, extra products, or decorative elements not implied by the name. "
                    "Without a reliable source image, make an illustrative interpretation based on the product name/category; "
                    "do not imply it is an exact supplier SKU photo."
                )
                try:
                    if source is not None:
                        result = image_pipe(prompt=prompt, image=source, strength=0.55, num_inference_steps=4, guidance_scale=0.0).images[0]
                    else:
                        result = text_pipe(prompt=prompt, height=768, width=512, num_inference_steps=4, guidance_scale=0.0).images[0]
                    ImageOps.fit(result.convert("RGB"), (512, 768), method=Image.Resampling.LANCZOS).save(dest, "JPEG", quality=88, optimize=True)
                    made += 1
                    print(f"  generated {view}", flush=True)
                except Exception as exc:
                    print(f"  FAILED {view}: {exc}", file=sys.stderr, flush=True)
                    continue

            view_index = list(VIEWS).index(view)
            images[view_index] = rel
            product["images"] = images[:5]
            if view == "front" or not product.get("img") or "loremflickr.com" in str(product.get("img", "")).lower():
                front = folder / "front.jpg"
                product["img"] = "/" + front.resolve().relative_to(public_root).as_posix() if front.exists() else rel
            write_catalog(args.catalog, data)

    print(f"\nFinished. New images generated: {made}. Catalogue saved: {args.catalog}")
    print("Commit/push the generated image folder and updated catalogue to publish them. This script updates the local JSON catalogue, not a live Google Sheet.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
