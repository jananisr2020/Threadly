#!/usr/bin/env python3
"""Download reusable, openly licensed Wikimedia Commons images for Juno products.

This script does NOT generate AI images and does NOT guarantee an exact supplier-SKU
match. Commons results are candidate reference/stock photos. Review them before selling.
It records source URLs and license/attribution metadata in manifest.json.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import re
import sys
import time
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "public" / "catalog.json"
DEFAULT_OUTPUT = ROOT / "public" / "free_product_images"
API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "JunoCatalogImageFetcher/1.0 (free image catalogue workflow)"
ALLOWED_MIME = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
VIEWS = ["front", "side", "back", "detail", "model"]


def safe_name(value: object) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "item")).strip("-._")[:100] or "item"


def request_json(url: str, timeout: int = 45) -> dict:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def search_images(query: str, limit: int = 50) -> list[dict]:
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "gsrlimit": min(limit, 50),
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime|size",
        "iiurlwidth": 1000,
        "format": "json",
        "formatversion": 2,
    }
    data = request_json(API_URL + "?" + urlencode(params))
    pages = data.get("query", {}).get("pages", [])
    results = []
    for page in pages:
        infos = page.get("imageinfo") or []
        if not infos:
            continue
        info = infos[0]
        mime = info.get("mime", "")
        if mime not in ALLOWED_MIME:
            continue
        if int(info.get("width", 0) or 0) < 250 or int(info.get("height", 0) or 0) < 250:
            continue
        meta = info.get("extmetadata") or {}
        license_name = (meta.get("LicenseShortName") or {}).get("value", "").strip()
        # Wikimedia Commons hosts free media; still require license metadata to record provenance.
        if not license_name:
            continue
        results.append({
            "title": page.get("title", ""),
            "url": info.get("thumburl") or info.get("url"),
            "original_url": info.get("descriptionurl") or info.get("url"),
            "mime": mime,
            "extension": ALLOWED_MIME[mime],
            "license": license_name,
            "license_url": (meta.get("LicenseUrl") or {}).get("value", ""),
            "artist": (meta.get("Artist") or {}).get("value", ""),
            "credit": (meta.get("Credit") or {}).get("value", ""),
            "attribution": (meta.get("AttributionRequired") or {}).get("value", ""),
            "description": (meta.get("ImageDescription") or {}).get("value", ""),
        })
    return results


def download_file(url: str, timeout: int = 60) -> bytes:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=timeout) as response:
        payload = response.read()
    if not payload:
        raise ValueError("download returned an empty file")
    if len(payload) > 20 * 1024 * 1024:
        raise ValueError("image exceeds 20 MB")
    return payload


def load_catalog(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data.get("products"), list):
        raise ValueError("Catalogue must contain a products array.")
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=0, help="process first N products; use 2 for a test")
    parser.add_argument("--product-id", help="process one exact product ID, e.g. JN0001")
    parser.add_argument("--views", type=int, choices=range(1, 6), default=5)
    parser.add_argument("--update-catalog", action="store_true", help="write successful local image paths into catalog.json")
    parser.add_argument("--sleep", type=float, default=0.3, help="pause between Commons API calls")
    parser.add_argument("--force", action="store_true", help="redownload existing view files")
    args = parser.parse_args()

    catalog = load_catalog(args.catalog)
    products = catalog["products"]
    if args.product_id:
        selected = [p for p in products if str(p.get("id")) == args.product_id]
        if not selected:
            print("ERROR: product ID not found: " + args.product_id, file=sys.stderr)
            return 2
    else:
        selected = products[:args.limit] if args.limit > 0 else products

    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {
        "source": "Wikimedia Commons API", "products": {}
    }
    # Avoid reusing the same source file for multiple products when possible.
    used_urls = set()
    for rec in manifest.get("products", {}).values():
        for view in rec.get("views", {}).values():
            if view.get("status") == "done" and view.get("original_url"):
                used_urls.add(view["original_url"])

    print("Products selected: " + str(len(selected)))
    print("Target: " + str(args.views) + " downloaded image(s) per product")
    print("Output: " + str(args.output.resolve()))
    print("Source: Wikimedia Commons; check manifest attribution and review every product match.")

    completed = 0
    failed = 0
    for index, product in enumerate(selected, 1):
        product_id = safe_name(product.get("id") or ("product-" + str(index)))
        name = str(product.get("name") or product_id)
        category = str(product.get("cat") or product.get("category") or "fashion")
        folder = args.output / product_id
        folder.mkdir(parents=True, exist_ok=True)
        record = manifest["products"].setdefault(product_id, {
            "id": str(product.get("id") or product_id),
            "name": name,
            "category": category,
            "views": {},
        })
        print("\n[" + str(index) + "/" + str(len(selected)) + "] " + product_id + " — " + name)

        existing_count = 0
        for view in VIEWS[:args.views]:
            old = record["views"].get(view, {})
            old_path = args.output / old.get("file", "")
            if old.get("status") == "done" and old_path.is_file() and old_path.stat().st_size > 0:
                existing_count += 1
        if existing_count >= args.views and not args.force:
            print("  Already complete; skipping.")
            completed += 1
            continue

        queries = []
        name_words = " ".join(name.split()[:6])
        if name_words:
            queries.append(name_words + " " + category)
        if category and category.lower() not in name_words.lower():
            queries.append(category + " fashion clothing accessories")
        candidates = []
        seen_candidate_urls = set()
        for query in queries:
            try:
                found = search_images(query, 50)
                for item in found:
                    key = item.get("original_url") or item.get("url")
                    if key and key not in seen_candidate_urls:
                        candidates.append(item)
                        seen_candidate_urls.add(key)
                if len(candidates) >= args.views:
                    break
            except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
                print("  SEARCH WARNING: " + str(exc)[:180])
            time.sleep(max(args.sleep, 0))

        slot = 0
        for item in candidates:
            if slot >= args.views:
                break
            source_key = item.get("original_url") or item.get("url")
            if source_key in used_urls:
                continue
            view = VIEWS[slot]
            path = folder / (view + item["extension"])
            old = record["views"].get(view, {})
            if path.exists() and path.stat().st_size > 0 and not args.force:
                slot += 1
                continue
            try:
                path.write_bytes(download_file(item["url"]))
                record["views"][view] = {
                    "status": "done",
                    "file": path.relative_to(args.output).as_posix(),
                    "source_title": item["title"],
                    "source_url": item["original_url"],
                    "original_url": source_key,
                    "license": item["license"],
                    "license_url": item["license_url"],
                    "artist": item["artist"],
                    "credit": item["credit"],
                    "attribution_required": item["attribution"],
                    "description": item["description"],
                    "search_query": queries[0] if queries else category,
                    "bytes": path.stat().st_size,
                }
                used_urls.add(source_key)
                print("  OK " + view + ": " + item["title"] + " [" + item["license"] + "]")
                slot += 1
                time.sleep(max(args.sleep, 0))
            except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
                print("  DOWNLOAD WARNING: " + str(exc)[:180])
                failed += 1

        # Build the local gallery from successful files only; don't fill gaps with unrelated duplicates.
        local_images = []
        for view in VIEWS[:args.views]:
            info = record["views"].get(view, {})
            image_path = args.output / info.get("file", "")
            if info.get("status") == "done" and image_path.is_file():
                rel = image_path.resolve().relative_to((ROOT / "public").resolve()).as_posix() if image_path.resolve().is_relative_to((ROOT / "public").resolve()) else None
                if rel:
                    local_images.append("/" + rel)
        record["downloaded_count"] = len(local_images)
        if len(local_images) < args.views:
            record["status"] = "partial" if local_images else "no_match"
            print("  PARTIAL: " + str(len(local_images)) + "/" + str(args.views) + " images found; no fake images added.")
        else:
            record["status"] = "done"
            completed += 1

        if args.update_catalog and local_images:
            product["images"] = local_images
            product["img"] = local_images[0]

        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.update_catalog:
        catalog["source"] = "Juno catalogue with locally downloaded Wikimedia Commons images; image licenses and attribution are recorded in public/free_product_images/manifest.json."
        catalog["notice"] = "Catalogue images are free-source candidate photos, not guaranteed exact supplier-SKU photos. Verify product matches and required attribution before accepting orders."
        args.catalog.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print("\nCatalogue updated: " + str(args.catalog))

    manifest["summary"] = {
        "products_processed": len(selected),
        "products_complete": completed,
        "download_warnings": failed,
        "finished_at_unix": int(time.time()),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("\nSummary: " + json.dumps(manifest["summary"]))
    print("Manifest: " + str(manifest_path.resolve()))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
