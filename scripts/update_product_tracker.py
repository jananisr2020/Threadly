#!/usr/bin/env python3
"""Build Juno's product change log and current catalogue inventory from Git history."""
import csv, datetime as dt, json, os, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = "threadly-v2/public/catalog.json"
EVENTS_PATH = ROOT / "product-tracker.csv"
INVENTORY_PATH = ROOT / "product-inventory.csv"
DAILY_PATH = ROOT / "product-daily-summary.csv"
REPORT_PATH = ROOT / "PRODUCT_TRACKER.md"
REPO = os.environ.get("GITHUB_REPOSITORY", "jananisr2020/Threadly")
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
BASE_URL = "https://github.com/" + REPO
LOW_STOCK_THRESHOLD = 5

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, errors="replace", stderr=subprocess.DEVNULL)

def parse_date(value):
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))

def load_catalog_at(sha):
    try:
        obj = json.loads(git("show", sha + ":" + CATALOG))
        return {str(p.get("id", "")).strip(): p for p in obj.get("products", []) if str(p.get("id", "")).strip()}
    except (subprocess.CalledProcessError, json.JSONDecodeError, TypeError):
        return {}

def stock(product):
    try:
        v = product.get("stock")
        return int(v) if v is not None and str(v).strip() else None
    except (TypeError, ValueError):
        return None

def val(product, key):
    v = product.get(key, "")
    return "" if v is None else v

def main():
    raw = git("log", "--reverse", "--format=%H%x1f%cI", "main", "--", CATALOG)
    commits = [tuple(line.split("\x1f", 1)) for line in raw.splitlines() if "\x1f" in line]
    if not commits:
        raise SystemExit("No catalog history found; trackers were not overwritten.")
    previous, events, daily = {}, [], []
    for sha, committed_at in commits:
        current = load_catalog_at(sha)
        added = sorted(set(current) - set(previous))
        removed = sorted(set(previous) - set(current))
        stock_changed, details_changed = [], []
        meta = git("show", "-s", "--format=%s%x1f%an", sha).strip().split("\x1f", 1)
        subject, author = meta[0], meta[1] if len(meta) > 1 else ""
        day = parse_date(committed_at).astimezone(IST).strftime("%Y-%m-%d")
        url = BASE_URL + "/commit/" + sha

        def event(kind, pid, old, new):
            p = new if new is not None else old
            events.append({
                "Date (India)": day, "Event": kind, "Product ID": pid,
                "Product Name": val(p, "name"), "Category": val(p, "cat"),
                "Previous Stock": "" if old is None or stock(old) is None else stock(old),
                "Current Stock": "" if new is None or stock(new) is None else stock(new),
                "Previous Price (INR)": "" if old is None else val(old, "price"),
                "Current Price (INR)": "" if new is None else val(new, "price"),
                "Current Catalogue Status": "Present" if new is not None else "Removed",
                "Commit": sha[:7], "Commit URL": url, "Commit Message": subject, "Author": author
            })

        for pid in added:
            event("ADDED", pid, None, current[pid])
        for pid in removed:
            event("REMOVED", pid, previous[pid], None)
        for pid in sorted(set(current) & set(previous)):
            old, new = previous[pid], current[pid]
            if stock(old) != stock(new):
                stock_changed.append(pid)
                event("STOCK_CHANGED", pid, old, new)
            keys = ("name", "cat", "brand", "mrp", "price", "off", "g", "sizes", "sale", "img", "images")
            if any(old.get(k) != new.get(k) for k in keys):
                details_changed.append(pid)
                event("DETAILS_UPDATED", pid, old, new)
        if added or removed or stock_changed or details_changed:
            daily.append({
                "Date (India)": day, "Commit": sha[:7], "Commit URL": url, "Commit Message": subject,
                "Products Added": len(added), "Products Removed": len(removed),
                "Stock Changes": len(stock_changed), "Product Details Updated": len(details_changed),
                "Added Product IDs": "; ".join(added), "Removed Product IDs": "; ".join(removed),
                "Stock-Changed Product IDs": "; ".join(stock_changed),
                "Products Not Added": "No new product IDs in this update" if not added else ""
            })
        previous = current

    # Roll commit-level changes up into one row per India calendar day.
    by_day = {}
    for row in daily:
        key = row["Date (India)"]
        if key not in by_day:
            by_day[key] = dict(row)
            by_day[key]["Commit"] = [row["Commit"]]
            by_day[key]["Commit URL"] = [row["Commit URL"]]
            by_day[key]["Commit Message"] = [row["Commit Message"]]
        else:
            target = by_day[key]
            for field in ("Products Added", "Products Removed", "Stock Changes", "Product Details Updated"):
                target[field] += row[field]
            for field in ("Added Product IDs", "Removed Product IDs", "Stock-Changed Product IDs"):
                values = [target[field], row[field]]
                target[field] = "; ".join(v for v in values if v)
            target["Commit"].append(row["Commit"])
            target["Commit URL"].append(row["Commit URL"])
            target["Commit Message"].append(row["Commit Message"])
    daily = []
    for day in sorted(by_day):
        row = by_day[day]
        row["Commit"] = "; ".join(row["Commit"])
        row["Commit URL"] = "; ".join(row["Commit URL"])
        row["Commit Message"] = " | ".join(row["Commit Message"])
        row["Products Not Added"] = "No new product IDs added on this date" if row["Products Added"] == 0 else ""
        daily.append(row)

    current = load_catalog_at("main")
    if not current:
        raise SystemExit("Current catalogue could not be read; inventory tracker was not overwritten.")
    known = [stock(p) for p in current.values() if stock(p) is not None]
    units = sum(known)
    in_stock = sum(n > 0 for n in known)
    out_stock = sum(n == 0 for n in known)
    low_stock = sum(0 < n <= LOW_STOCK_THRESHOLD for n in known)
    unknown = len(current) - len(known)

    event_fields = ["Date (India)", "Event", "Product ID", "Product Name", "Category", "Previous Stock",
                    "Current Stock", "Previous Price (INR)", "Current Price (INR)", "Current Catalogue Status",
                    "Commit", "Commit URL", "Commit Message", "Author"]
    with EVENTS_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=event_fields); w.writeheader(); w.writerows(events)
    daily_fields = ["Date (India)", "Commit", "Commit URL", "Commit Message", "Products Added", "Products Removed",
                    "Stock Changes", "Product Details Updated", "Added Product IDs", "Removed Product IDs",
                    "Stock-Changed Product IDs", "Products Not Added"]
    with DAILY_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=daily_fields); w.writeheader(); w.writerows(daily)
    inventory_fields = ["Product ID", "Product Name", "Category", "Brand", "Selling Price (INR)", "MRP (INR)",
                        "Stock Units", "Stock Status", "Visible in Catalogue", "Image Present", "Last Checked Commit"]
    head = git("rev-parse", "--short", "main").strip()
    with INVENTORY_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=inventory_fields); w.writeheader()
        for pid, p in sorted(current.items()):
            qty = stock(p)
            status = "UNKNOWN" if qty is None else ("OUT OF STOCK" if qty == 0 else
                     ("LOW STOCK" if qty <= LOW_STOCK_THRESHOLD else "IN STOCK"))
            w.writerow({
                "Product ID": pid, "Product Name": val(p, "name"), "Category": val(p, "cat"),
                "Brand": val(p, "brand"), "Selling Price (INR)": val(p, "price"), "MRP (INR)": val(p, "mrp"),
                "Stock Units": "" if qty is None else qty, "Stock Status": status, "Visible in Catalogue": "Yes",
                "Image Present": "Yes" if val(p, "img") or p.get("images") else "No", "Last Checked Commit": head
            })

    lines = [
        "# Juno Product Tracker & Inventory Report", "",
        "- Repository: [" + REPO + "](" + BASE_URL + ")",
        "- Primary catalogue tracked: " + CATALOG,
        "- Last generated: " + dt.datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST"),
        "- Current catalogue product records: **" + str(len(current)) + "**",
        "- Current stock units recorded in catalogue: **" + str(units) + "**",
        "- In stock: **" + str(in_stock) + "** product records | Low stock (1–" + str(LOW_STOCK_THRESHOLD) +
        "): **" + str(low_stock) + "** | Out of stock: **" + str(out_stock) + "** | Unknown stock: **" + str(unknown) + "**",
        "- Files: [product-inventory.csv](./product-inventory.csv) · [product-tracker.csv](./product-tracker.csv) · [product-daily-summary.csv](./product-daily-summary.csv)",
        "", "## How this tracker works", "",
        "GitHub Actions rebuilds these files from the catalogue Git history on pushes to main. A product is counted as added only when its ID first appears in the committed primary catalogue. Stock and detail edits are logged separately; deleted IDs are recorded as removed.",
        "", "Important scope: counts describe committed catalog.json, not a live Google Sheets query or warehouse count. The repository cannot infer products proposed but never submitted to the catalogue. Daily summary rows explicitly mark updates where no new product IDs were added. The legacy products.csv is not merged into these totals to avoid double-counting a separate catalogue.",
        "", "## Daily product changes (India time)", "",
        "| Date | Added | Removed | Stock changed | Details updated | What was not added |",
        "|---|---:|---:|---:|---:|---|"
    ]
    for row in reversed(daily):
        note = row["Products Not Added"] or "—"
        lines.append("| " + row["Date (India)"] + " | " + str(row["Products Added"]) + " | " +
                     str(row["Products Removed"]) + " | " + str(row["Stock Changes"]) + " | " +
                     str(row["Product Details Updated"]) + " | " + note.replace("|", r"\|") + " |")
    if not daily:
        lines.append("| No catalogue changes recorded | 0 | 0 | 0 | 0 | No catalogue commits found |")
    lines += [
        "", "## Inventory rules", "",
        "- LOW STOCK means 1–" + str(LOW_STOCK_THRESHOLD) + " units; OUT OF STOCK means 0; blank or non-numeric stock is UNKNOWN.",
        "- Inventory CSV lists each current product ID once with its latest committed name, category, price and stock.",
        "- Products added means new product IDs, not image-generation attempts or edits to existing products.",
        "", "## Validation note", "",
        "This is a repository tracker. Verify the live storefront and Google Sheets-backed inventory separately before treating these counts as fulfilment-ready stock.", ""
    ]
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print("Generated product trackers. Current catalogue: %d products; %d stock units; %d in stock; %d low; %d out; %d unknown." %
          (len(current), units, in_stock, low_stock, out_stock, unknown))

if __name__ == "__main__":
    main()
