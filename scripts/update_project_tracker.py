#!/usr/bin/env python3
"""Regenerate Juno's commit tracker and readable timeline from Git history."""
import csv, datetime as dt, os, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "project-tracker.csv"
MD_PATH = ROOT / "PROJECT_TRACKER.md"
REPO = os.environ.get("GITHUB_REPOSITORY", "jananisr2020/Threadly")
BRANCH = os.environ.get("GITHUB_REF_NAME", "main")
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
BASE_URL = "https://github.com/" + REPO

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, errors="replace")

def clean(s):
    return re.sub(r"\s+", " ", s or "").strip()

def summary(subject, body, paths):
    low = (subject + " " + body).lower()
    buckets = [
        (("catalogue", "catalog", "product database", "product data"), "Catalogue and products"),
        (("seller", "marketplace", "vendor"), "Seller marketplace"),
        (("checkout", "cart", "order", "payment", "razorpay", "stock", "inventory", "coupon"), "Checkout and orders"),
        (("android", "apk", "play store", "launcher icon"), "Android app"),
        (("pwa", "service worker", "install prompt", "manifest"), "Installable web app"),
        (("seo", "sitemap", "robots.txt", "metadata"), "Search visibility"),
        (("branding", "brand", "juno", "threadly", "favicon", "logo", "icon"), "Branding and app identity"),
        (("readme", "document", "architecture", "setup guide", "deployment guide"), "Documentation"),
        (("image", "photo", "gallery", "banner"), "Product imagery"),
        (("login", "signup", "password", "authentication", "otp"), "Account access"),
        (("netlify", "deploy", "workflow", "github actions", "validation", "syntax"), "Deployment and validation"),
        (("email", "notification", "sms"), "Customer communication"),
        (("price", "pricing", "budget"), "Pricing"),
    ]
    area = next((label for words, label in buckets if any(w in low for w in words)), "Project maintenance")
    action = clean(subject).rstrip(".")
    file_text = ", ".join(paths[:4]) or "no changed-file list returned"
    if len(paths) > 4:
        file_text += ", and " + str(len(paths)-4) + " more file(s)"
    detail = clean(body)
    if detail and detail.lower() != action.lower():
        detail = detail[:220] + ("…" if len(detail) > 220 else "")
        return area + ": " + action + ". " + detail + " Files: " + file_text + "."
    return area + ": " + action + ". This changed " + str(len(paths)) + " file(s): " + file_text + "."

def date(value):
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))

def md_escape(s):
    return s.replace("|", r"\|").replace("\n", " ")

def commits_from_git():
    raw = git("log", "--reverse", "--format=%H%x1f%aI%x1f%cI%x1f%an%x1f%s%x1f%b%x1e", "main")
    result = []
    for chunk in raw.split("\x1e"):
        chunk = chunk.strip("\n")
        if not chunk:
            continue
        p = chunk.split("\x1f", 5)
        if len(p) < 6:
            continue
        sha, authored, committed, author, subject, body = p
        paths = git("diff-tree", "--root", "--no-commit-id", "--name-only", "-r", sha).splitlines()
        stat = git("show", "--format=", "--numstat", sha)
        added = deleted = 0
        for line in stat.splitlines():
            cols = line.split("\t", 2)
            if len(cols) >= 2:
                added += int(cols[0]) if cols[0].isdigit() else 0
                deleted += int(cols[1]) if cols[1].isdigit() else 0
        result.append(dict(sha=sha, short=sha[:7], date=committed, author=author,
                           subject=clean(subject), body=clean(body), paths=paths,
                           files=len(paths), added=added, deleted=deleted,
                           url=BASE_URL + "/commit/" + sha))
    return result

def main():
    commits = commits_from_git()
    if not commits:
        raise SystemExit("No commits found on main; tracker was not overwritten.")
    fields = ["Commit date (UTC)", "Commit date (India)", "Author", "Commit message",
              "Plain-English summary", "Full SHA", "Short SHA", "Commit URL",
              "Files changed count", "Files changed paths", "Lines added", "Lines deleted",
              "Test status", "Deployment status"]
    with CSV_PATH.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for c in commits:
            utc = date(c["date"]).astimezone(dt.timezone.utc)
            ist = date(c["date"]).astimezone(IST)
            w.writerow({
                "Commit date (UTC)": utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "Commit date (India)": ist.strftime("%Y-%m-%d %H:%M:%S IST"),
                "Author": c["author"], "Commit message": c["subject"],
                "Plain-English summary": summary(c["subject"], c["body"], c["paths"]),
                "Full SHA": c["sha"], "Short SHA": c["short"], "Commit URL": c["url"],
                "Files changed count": c["files"], "Files changed paths": "; ".join(c["paths"]),
                "Lines added": c["added"], "Lines deleted": c["deleted"],
                "Test status": "Not inferable from commit history; check CI separately",
                "Deployment status": "Not inferable from commit history; check Netlify separately",
            })
    grouped = {}
    for c in commits:
        day = date(c["date"]).astimezone(IST).strftime("%Y-%m-%d")
        grouped.setdefault(day, []).append(c)
    first, last = commits[0], commits[-1]
    generated = dt.datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")
    lines = [
        "# Juno / Threadly — Project Change Report", "",
        "- Repository: [" + REPO + "](" + BASE_URL + ")",
        "- Branch tracked: " + BRANCH + " (history read from main)",
        "- Last generated: " + generated,
        "- Commits covered: " + str(len(commits)),
        "- Date range: " + date(first["date"]).astimezone(IST).strftime("%d %b %Y %H:%M IST") + " to " + date(last["date"]).astimezone(IST).strftime("%d %b %Y %H:%M IST"),
        "- Spreadsheet log: [Open project-tracker.csv](./project-tracker.csv)", "",
        "## Automatic updates", "",
        "A GitHub Actions workflow refreshes this report and CSV on pushes to main, excluding tracker-only changes, and supports manual runs from the Actions tab. It commits the regenerated files only when the content changes.", "",
        "## How to read each entry", "",
        "Every entry includes a short plain-English explanation, the commit time in India time, a link to the exact code change, file count and line changes. The CSV includes UTC and IST timestamps and all changed paths.", "",
        "A commit does not prove tests passed or the change reached the live website. Those statuses are not guessed; check the CI run and Netlify deployment separately.", "",
        "## Timeline — India Standard Time", ""
    ]
    for day in sorted(grouped):
        lines += ["### " + dt.datetime.strptime(day, "%Y-%m-%d").strftime("%A, %d %B %Y"), ""]
        for c in grouped[day]:
            when = date(c["date"]).astimezone(IST).strftime("%H:%M:%S IST")
            paths = ", ".join(c["paths"][:6]) or "file list unavailable"
            if len(c["paths"]) > 6:
                paths += ", plus " + str(len(c["paths"])-6) + " more"
            lines += [
                "#### " + when + " — [" + md_escape(c["subject"]) + "](" + c["url"] + ")", "",
                summary(c["subject"], c["body"], c["paths"]), "",
                "- Commit: " + c["short"] + " | Files changed: " + str(c["files"]) + " | Lines: +" + str(c["added"]) + " / -" + str(c["deleted"]),
                "- Changed files: " + paths,
                "- Test status: not inferred from the commit; inspect CI.",
                "- Deployment status: not inferred from the commit; verify Netlify.",
                ""
            ]
    lines += [
        "## Workstream guide", "",
        "| Area | What it covers |", "|---|---|",
        "| Branding and app identity | Threadly-to-Juno naming, icons, PWA and Android identity. |",
        "| Catalogue and products | Product data, category navigation, catalogue recovery, galleries and prices. |",
        "| Seller marketplace | Seller application, listings, seller orders and ledger foundations. |",
        "| Checkout and orders | Cart, coupons, COD removal, stock validation, payment callbacks and reconciliation. |",
        "| Installable app | PWA and Android build/install support. |",
        "| Documentation and validation | Setup guides, architecture, deployment guidance and checks. |", "",
        "## Follow-up cautions", "",
        "- Review checkout and inventory reconciliation with real tests before production.",
        "- Google Sheets writes across separate tabs are not atomic; partial stock updates may need manual reconciliation.",
        "- Seller login, Sheets permissions, live checkout and Netlify settings require environment-level verification.",
        "- Before repeating a fix, inspect its history entry, commit diff, CI result and deployed build.", ""
    ]
    MD_PATH.write_text("\n".join(lines), encoding="utf-8")
    print("Generated project-tracker.csv and PROJECT_TRACKER.md from " + str(len(commits)) + " commits.")

if __name__ == "__main__":
    main()
