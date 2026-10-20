#!/usr/bin/env python3
"""Generate Juno's repository-side tracker guide and privacy-safe Excel workbook."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "RUNTIME_TRACKERS.md"
XLSX = ROOT / "Juno_Runtime_Trackers.xlsx"
IST = timezone(timedelta(hours=5, minutes=30))
generated = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST")
TRACKERS = [
 {"name":"Login & API Audit","sheet":"ActivityLog","purpose":"Audit server/API activity. This is not a dedicated login-only stream; the login handler must explicitly emit success/failure events for complete login tracking.","columns":["Event ID","Timestamp (IST)","Event","Account/User ID","Role","Result","IP/Request ID","Details"],"privacy":"Keep account identifiers and IP addresses in the private Google Sheet only. Never publish raw audit rows in this public repository."},
 {"name":"Website Activity","sheet":"WebsiteActivity","purpose":"Consent-based website events: page_view, product_click, add_to_cart, buy_now, wishlist_toggle, compare_toggle, search_submit, checkout_start, account_action, seller_action and cart_action.","columns":["Event ID","Timestamp (IST)","Session ID","Event","Page","Product ID","Control","Referrer Origin","Details"],"privacy":"Only enabled after Accept all. Raw search terms, passwords, form contents and payment details are not sent. Do not commit session-level data to this public repo."},
 {"name":"Orders","sheet":"Orders","purpose":"Order source of truth for checkout, payment and fulfilment. This workbook provides a structured template, not a live customer-data export.","columns":["Order ID","Created At (IST)","Customer Ref","Items / SKU","Quantity","Order Value (INR)","Payment Status","Fulfilment Status","Seller Ref","Updated At (IST)","Notes"],"privacy":"Customer names, phone numbers, addresses, payment identifiers and order-level personal data must remain in the private Google Sheet. A status timeline needs a separate append-only OrderEvents tab."}
]
MEANINGS={"Event ID":"Unique event identifier","Timestamp (IST)":"Event time in India Standard Time","Session ID":"Pseudonymous browser session identifier","Event":"Allowlisted action name","Page":"Page path only","Product ID":"Product/catalogue identifier","Control":"UI control/action label","Referrer Origin":"Referring website origin, not full URL","Details":"Sanitized metadata only","Account/User ID":"Internal account reference","Role":"Customer, seller, admin or service role","Result":"Success/failure or outcome","IP/Request ID":"Operational diagnostic identifier; keep private","Order ID":"Order reference","Created At (IST)":"Order creation time","Customer Ref":"Internal customer reference; avoid personal details","Items / SKU":"Products/SKUs on order","Quantity":"Units ordered","Order Value (INR)":"Order total in INR","Payment Status":"Pending, paid, failed, refunded, etc.","Fulfilment Status":"Processing, shipped, delivered, cancelled, etc.","Seller Ref":"Seller reference","Updated At (IST)":"Last update time","Notes":"Non-sensitive operational notes"}
def build_doc():
 lines=["# Juno Runtime Trackers","",f"- Generated: {generated}","- Repository: [jananisr2020/Threadly](https://github.com/jananisr2020/Threadly)","- Excel workbook: [Juno_Runtime_Trackers.xlsx](./Juno_Runtime_Trackers.xlsx)","- Live operational records stay in private Google Sheets; this public repository contains definitions/templates, not customer-level records.","","## How this works","","Website events are written to the WebsiteActivity Google Sheet tab after optional consent. ActivityLog is a general server/API audit stream and is not guaranteed to be a complete login-only tracker unless login success/failure events are explicitly emitted. Orders remains the order source of truth.","","GitHub Actions regenerates this guide and workbook on pushes to main and on manual workflow runs. The workbook has headers, field guidance and formula-driven row counts for data entered into the workbook; it does not claim to contain live Sheet rows.","","**Privacy boundary:** this repository is public. Do not copy raw login, session, customer or order rows into it. Live records remain in Google Sheets.","","## Tracker definitions",""]
 for t in TRACKERS:
  lines += [f"### {t['name']}","","- Live tab: "+t["sheet"],"- Purpose: "+t["purpose"],"- Privacy: "+t["privacy"],"","| Field | Meaning |","|---|---|"]
  for col in t["columns"]: lines.append(f"| {col} | {MEANINGS.get(col,'Tracker field')} |")
  lines.append("")
 lines += ["## Current limitations","","- Website activity is consent-gated and writes to WebsiteActivity when backend and Google Sheets credentials are configured.","- ActivityLog is a general server/API audit stream, not a guaranteed complete login tracker yet.","- Orders contains current order records; a full order-status timeline needs an append-only OrderEvents tab and explicit status-change writes.","- The workbook is regenerated from tracker definitions. Live records stay in Google Sheets to avoid publishing personal or session data.",""]
 DOC.write_text("\n".join(lines),encoding="utf-8")
def build_workbook():
 wb=Workbook(); intro=wb.active; intro.title="Read Me"
 for row in [["Juno Runtime Trackers"],["Generated",generated],["Purpose","Repository-side templates and field definitions; live event rows remain in private Google Sheets."],["Privacy","Do not copy raw login, session, customer, address, phone or order rows into this public repository."],["Live source","Google Sheets tabs: ActivityLog, WebsiteActivity, Orders"],["Refresh","GitHub Actions regenerates this workbook on main pushes and manual runs."],["Important","This is not a live data export. Counts reflect rows entered into this workbook only."]]: intro.append(row)
 for t in TRACKERS:
  ws=wb.create_sheet(t["name"][:31]); ws.append(t["columns"]); ws.freeze_panes="A2"; ws.auto_filter.ref=f"A1:{get_column_letter(len(t['columns']))}1"
  ws.append(["" for _ in t["columns"]]); ws.cell(2,1,"Template row — replace/remove this row before entering data")
  ws.append([]); ws.append(["Purpose",t["purpose"]]); ws.append(["Live Google Sheet tab",t["sheet"]]); ws.append(["Privacy",t["privacy"]])
  for col,width in enumerate([22]+[23]*(len(t["columns"])-1),1): ws.column_dimensions[get_column_letter(col)].width=width
 summary=wb.create_sheet("Summary"); summary.append(["Tracker","Live Google Sheet tab","Rows in workbook","Last generated"])
 for t in TRACKERS:
  name=t["name"][:31]; summary.append([t["name"],t["sheet"],f'=MAX(COUNTA(\'{name}\'!A:A)-1,0)',generated])
 for ws in wb.worksheets:
  ws.freeze_panes=ws.freeze_panes or "A2"; ws.sheet_view.showGridLines=False
  for row in ws.iter_rows():
   for cell in row:
    cell.alignment=Alignment(vertical="top",wrap_text=True)
    if cell.row==1: cell.font=Font(bold=True,color="FFFFFF"); cell.fill=PatternFill("solid",fgColor="343A40")
  if ws.max_row: ws.row_dimensions[1].height=30
  for col in range(1,ws.max_column+1):
   if not ws.column_dimensions[get_column_letter(col)].width: ws.column_dimensions[get_column_letter(col)].width=24
 wb.save(XLSX)
if __name__=="__main__":
 build_doc(); build_workbook(); print(f"Generated {DOC.name} and {XLSX.name} at {generated}")
