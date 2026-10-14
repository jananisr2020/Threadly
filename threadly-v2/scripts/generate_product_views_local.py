#!/usr/bin/env python3
"""Generate Juno catalogue gallery images locally with an open-weight SDXL Turbo model.

No OpenAI/Hugging Face API key is used. The public model weights are downloaded once
from Hugging Face; generation runs on this computer. Generated files and catalog.json
are updated incrementally so an interrupted run can be resumed.
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
from urllib.parse import urlparse

import requests
import torch
from PIL import Image, ImageOps
from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public" / "catalog.json"
OUT = ROOT / "public" / "products" / "generated"
MODEL_DEFAULT = "stabilityai/sdxl-turbo"
VIEWS = {
    "front": "front-facing ecommerce hero product photo, centered, full product visible",
    "side": "distinct side or alternate angle product photo, clearly different composition",
    "back": "rear, reverse, or underside product view, whichever is meaningful",
    "detail": "macro close-up of material, stitching, texture, finish, clasp, and real product details",
    "lifestyle": "premium lifestyle ecommerce photo showing the item in realistic use; if wearable, show an adult model wearing it naturally",
}
def safe(value):
    return re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "item")).strip("-._")[:90] or "item"
def read_catalog(path):
    data=json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data.get("products"),list): raise ValueError("catalog.json must contain a products list")
    return data
def write_catalog(path,data):
    tmp=path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    tmp.replace(path)
def get_source(product):
    candidates=[]
    if isinstance(product.get("images"),list): candidates.extend(product["images"])
    candidates.append(product.get("img"))
    for url in candidates:
        if not isinstance(url,str) or not url.startswith(("http://","https://")): continue
        if "loremflickr.com" in url.lower(): continue
        try:
            r=requests.get(url,timeout=20,headers={"User-Agent":"JunoLocalImageGenerator/1.0"})
            if not r.ok or not r.headers.get("content-type","").startswith("image/") or len(r.content)>15*1024*1024: continue
            import io
            im=Image.open(io.BytesIO(r.content)).convert("RGB")
            return ImageOps.fit(im,(512,768),method=Image.Resampling.LANCZOS)
        except Exception: continue
    return None
def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--product-id",help="generate only one product, e.g. JN0001")
    ap.add_argument("--limit",type=int,default=0,help="limit to first N products")
    ap.add_argument("--views",nargs="+",choices=list(VIEWS),default=list(VIEWS))
    ap.add_argument("--model",default=MODEL_DEFAULT)
    ap.add_argument("--device",choices=["auto","cuda","mps","cpu"],default="auto")
    ap.add_argument("--force",action="store_true",help="regenerate existing images")
    ap.add_argument("--catalog",type=Path,default=CATALOG)
    ap.add_argument("--output",type=Path,default=OUT)
    args=ap.parse_args()
    if args.device=="auto":
        device="cuda" if torch.cuda.is_available() else ("mps" if getattr(torch.backends,"mps",None) and torch.backends.mps.is_available() else "cpu")
    else: device=args.device
    dtype=torch.float16 if device in ("cuda","mps") else torch.float32
    print(f"Model: {args.model} | device: {device} | no API key required")
    print("First run downloads model weights. CPU generation is possible but much slower than a supported GPU.")
    try:
        text_pipe=AutoPipelineForText2Image.from_pretrained(args.model,torch_dtype=dtype, variant="fp16" if dtype==torch.float16 else None)
        text_pipe.to(device)
        image_pipe=AutoPipelineForImage2Image.from_pretrained(args.model,torch_dtype=dtype, variant="fp16" if dtype==torch.float16 else None)
        image_pipe.to(device)
    except Exception as e:
        print(f"Could not load model {args.model}: {e}",file=sys.stderr); return 2
    data=read_catalog(args.catalog); products=data["products"]
    if args.product_id:
        products=[p for p in products if str(p.get("id"))==args.product_id]
        if not products: print("Product ID not found.",file=sys.stderr); return 2
    elif args.limit>0: products=products[:args.limit]
    args.output.mkdir(parents=True,exist_ok=True)
    made=0
    for pi,p in enumerate(products,1):
        pid=safe(p.get("id") or f"product-{pi}")
        name=str(p.get("name") or pid); cat=str(p.get("cat") or p.get("category") or "fashion accessories")
        print(f"\n[{pi}/{len(products)}] {pid} — {name}",flush=True)
        folder=args.output/pid; folder.mkdir(parents=True,exist_ok=True)
        source=get_source(p)
        for view in args.views:
            dest=folder/f"{view}.jpg"
            rel="/"+dest.relative_to(ROOT/"public").as_posix()
            if dest.exists() and not args.force:
                print(f"  keep {view}")
            else:
                prompt=(f"Photorealistic commercial ecommerce product photograph for Juno. Product name: {name}. "
                        f"Category: {cat}. Listed colour: {p.get('col','not specified')}. "
                        f"Requested shot: {VIEWS[view]}. One product only, coherent plausible design, natural proportions, "
                        "soft studio light, pale neutral background, crisp focus, portrait 2:3 composition. "
                        "No text, letters, watermark, logo, collage, extra products, or decorative elements not implied by the name. "
                        "If there is no reliable source image, make an illustrative interpretation based on the product name/category; "
                        "do not imply it is an exact supplier SKU photo.")
                try:
                    if source is not None:
                        result=image_pipe(prompt=prompt,image=source,strength=0.55,num_inference_steps=4,guidance_scale=0.0).images[0]
                    else:
                        result=text_pipe(prompt=prompt,height=768,width=512,num_inference_steps=4,guidance_scale=0.0).images[0]
                    result=ImageOps.fit(result.convert("RGB"),(512,768),method=Image.Resampling.LANCZOS)
                    result.save(dest,"JPEG",quality=88,optimize=True)
                    made+=1; print(f"  generated {view}",flush=True)
                except Exception as e:
                    print(f"  FAILED {view}: {e}",file=sys.stderr); continue
            imgs=p.get("images") if isinstance(p.get("images"),list) else []
            # Replace the five placeholder gallery entries with generated local assets as they become available.
            view_index=list(VIEWS).index(view)
            while len(imgs)<5: imgs.append("")
            imgs[view_index]=rel
            p["images"]=imgs[:5]
            if view=="front" or not p.get("img") or "loremflickr.com" in str(p.get("img","")).lower():
                p["img"]="/"+(folder/"front.jpg").relative_to(ROOT/"public").as_posix() if (folder/"front.jpg").exists() else rel
            write_catalog(args.catalog,data)
    print(f"\nFinished. New images generated: {made}. Catalogue saved: {args.catalog}")
    print("Copy/commit public/products/generated plus the updated public/catalog.json to publish these images.")
    return 0
if __name__=="__main__": raise SystemExit(main())
