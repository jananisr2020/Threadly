#!/usr/bin/env python3
"""Poll Juno's Google Sheets Products tab and generate/publish missing gallery views locally.

This runs on a machine that has Python, model dependencies, Google service-account access,
and a Git checkout authenticated to push to the Juno repository. It is NOT a Netlify
function. A successful push triggers the normal Netlify Git deployment.
"""
from __future__ import annotations
import json, os, re, subprocess, sys, time
from pathlib import Path
from urllib.parse import quote

import requests
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import AuthorizedSession

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CATALOG = PUBLIC / "catalog.json"
GENERATOR = ROOT / "scripts" / "generate_product_views_local.py"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
VIEWS = ["front", "side", "back", "detail", "lifestyle"]
ALIASES = {
    "id": ["product id", "id", "sku", "product code"],
    "name": ["product name", "name", "title"],
    "category": ["category", "cat"],
    "brand": ["brand", "brand name"],
    "price": ["selling price", "price", "sale price"],
    "mrp": ["mrp", "original price", "list price"],
    "image": ["image", "image url", "image 1", "product image", "primary image"],
    "image 2": ["image 2", "ai image 2", "gallery image 2"],
    "image 3": ["image 3", "ai image 3", "gallery image 3"],
    "image 4": ["image 4", "ai image 4", "gallery image 4"],
    "image 5": ["image 5", "ai image 5", "gallery image 5"],
    "status": ["image status", "image generation status"],
}

def norm(value):
    return re.sub(r"\s+", " ", str(value or "").strip().lower().replace("_", " ").replace("-", " "))

def col(headers, key):
    wanted = {norm(x) for x in ALIASES.get(key, [key])}
    for index, header in enumerate(headers):
        if norm(header) in wanted:
            return index
    return -1

def value(row, index):
    return str(row[index]).strip() if index >= 0 and index < len(row) and row[index] is not None else ""

def safe_id(value):
    return re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "item")).strip("-._")[:90] or "item"

def load_auth():
    sheet_id = os.environ.get("SHEET_ID", "").strip()
    email = os.environ.get("GOOGLE_SERVICE_ACCOUNT_EMAIL", "").strip()
    key = os.environ.get("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n").strip()
    if not all([sheet_id, email, key]):
        raise RuntimeError("Set SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY.")
    creds = Credentials.from_service_account_info(
        {"type": "service_account", "client_email": email, "private_key": key,
         "token_uri": "https://oauth2.googleapis.com/token"},
        scopes=SCOPES,
    )
    return sheet_id, AuthorizedSession(creds)

def sheets_request(session, url, method="GET", payload=None):
    response = session.request(method, url, json=payload, timeout=45)
    response.raise_for_status()
    return response.json() if response.content else {}

def read_sheet(session, sheet_id, tab):
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{quote(tab, safe='')}"
    return sheets_request(session, url).get("values", [])

def update_row(session, sheet_id, tab, row_number, row):
    range_name = quote(f"{tab}!A{row_number}", safe="!:$")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{range_name}?valueInputOption=RAW"
    sheets_request(session, url, "PUT", {"values": [row]})

def ensure_headers(session, sheet_id, tab, rows):
    headers = [str(x).strip() for x in (rows[0] if rows else [])]
    if not headers:
        raise RuntimeError(f"The {tab} tab is empty or has no header row.")
    changed = False
    for name in ["Image", "Image 2", "Image 3", "Image 4", "Image 5", "Image Status"]:
        if col(headers, name) < 0:
            headers.append(name)
            changed = True
    if changed:
        range_name = quote(f"{tab}!A1", safe="!:$")
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{range_name}?valueInputOption=RAW"
        sheets_request(session, url, "PUT", {"values": [headers]})
        rows[0] = headers
    return headers, changed

def upsert_catalog_product(data, row, headers):
    product_id = value(row, col(headers, "id"))
    name = value(row, col(headers, "name"))
    category = value(row, col(headers, "category")) or "Fashion Accessories"
    if not product_id or not name:
        return None
    products = data.setdefault("products", [])
    product = next((p for p in products if str(p.get("id", "")).strip() == product_id), None)
    if product is None:
        product = {
            "id": product_id, "cat": category, "name": name,
            "brand": value(row, col(headers, "brand")) or "Juno",
            "g": "Women", "mrp": 0, "price": 0, "off": 0, "rt": "0.0", "rv": 0,
            "col": "#f5c6d6", "sizes": ["One Size"], "sz": False, "stock": 0,
            "sale": False, "img": "", "ic": category, "lab": "", "images": [""] * 5,
        }
        products.append(product)
    product["name"] = name
    product["cat"] = category
    product["brand"] = value(row, col(headers, "brand")) or product.get("brand", "Juno")
    for key, aliases in [("price", ["price", "selling price", "sale price"]), ("mrp", ["mrp", "original price", "list price"])]:
        idx = next((i for i,h in enumerate(headers) if norm(h) in {norm(a) for a in aliases}), -1)
        raw = value(row, idx).replace(",", "").replace("₹", "")
        if raw:
            try: product[key] = float(raw) if "." in raw else int(raw)
            except ValueError: pass
    if not isinstance(product.get("images"), list):
        product["images"] = [""] * 5
    product["images"] = (product["images"] + [""] * 5)[:5]
    return product

def git_publish(product_ids):
    subprocess.run(["git", "add", "public/catalog.json", "public/products/generated"], cwd=ROOT, check=True)
    staged = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT)
    if staged.returncode == 0:
        print("No generated changes to publish.")
        return
    msg = "Juno: publish generated product images (" + ", ".join(product_ids[:8]) + (", ..." if len(product_ids) > 8 else "") + ")"
    subprocess.run(["git", "commit", "-m", msg], cwd=ROOT, check=True)
    subprocess.run(["git", "push"], cwd=ROOT, check=True)
    print("Pushed generated assets. Netlify should deploy from its connected Git branch.")

def run_once(session, sheet_id, tab, site_url):
    rows = read_sheet(session, sheet_id, tab)
    if len(rows) < 2:
        print("No product rows found.")
        return 0
    headers, _ = ensure_headers(session, sheet_id, tab, rows)
    idx = {key: col(headers, key) for key in ["id", "name", "category", "image", "image 2", "image 3", "image 4", "image 5", "status"]}
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    generated_ids = []
    for row_number, source_row in enumerate(rows[1:], start=2):
        row = list(source_row) + [""] * max(0, len(headers) - len(source_row))
        product_id, name = value(row, idx["id"]), value(row, idx["name"])
        if not product_id or not name:
            continue
        images = [value(row, idx[f"image{(' ' + str(i)) if i > 1 else ''}"]) for i in range(1, 6)]
        if all(url and "loremflickr.com" not in url.lower() for url in images):
            continue
        product = upsert_catalog_product(data, row, headers)
        if not product:
            continue
        CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Generating five views for {product_id} — {name}", flush=True)
        subprocess.run([sys.executable, str(GENERATOR), "--product-id", product_id], cwd=ROOT, check=True)
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
        product = next(p for p in data["products"] if str(p.get("id")) == product_id)
        local_images = product.get("images", [])
        public_urls = []
        for i, view in enumerate(VIEWS):
            image_path = ROOT / "public" / "products" / "generated" / safe_id(product_id) / f"{view}.jpg"
            if image_path.exists():
                public_urls.append(site_url.rstrip("/") + "/" + image_path.relative_to(PUBLIC).as_posix())
            else:
                public_urls.append(local_images[i] if i < len(local_images) else "")
        if not all(public_urls):
            print(f"Some views missing for {product_id}; leaving it for a later retry.", file=sys.stderr)
            continue
        for i, key in enumerate(["image", "image 2", "image 3", "image 4", "image 5"]):
            row[idx[key]] = public_urls[i]
        if idx["status"] >= 0:
            row[idx["status"]] = "Generated locally; awaiting/published via Netlify Git deploy"
        update_row(session, sheet_id, tab, row_number, row)
        generated_ids.append(product_id)
    if generated_ids:
        git_publish(generated_ids)
    return len(generated_ids)

def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true", help="check the sheet once and exit")
    parser.add_argument("--interval", type=int, default=600, help="poll interval in seconds (default: 600)")
    parser.add_argument("--tab", default=os.environ.get("JUNO_PRODUCTS_TAB", "Products"))
    args = parser.parse_args()
    site_url = os.environ.get("JUNO_SITE_URL", "").strip().rstrip("/")
    if not site_url:
        parser.error("Set JUNO_SITE_URL to the public Juno site URL, e.g. https://your-site.netlify.app")
    sheet_id, session = load_auth()
    while True:
        try:
            count = run_once(session, sheet_id, args.tab, site_url)
            print(f"Sheet sync complete. Products published this cycle: {count}", flush=True)
        except Exception as exc:
            print(f"Sync cycle failed: {exc}", file=sys.stderr, flush=True)
        if args.once:
            break
        time.sleep(max(60, args.interval))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
