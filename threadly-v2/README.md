# Juno on Netlify: setup guide

Your Google Sheet is the database. You add products there (or on the /admin page), and the store, orders and customer list all read and write to it. Nothing needs editing in the HTML.

## Step 1. Put the sheet on Google
1. Go to sheets.google.com > File > Import > Upload `Threadly_Database.xlsx` > "Create new spreadsheet".
2. Keep the tab names (Products, Orders, Users) and the first row exactly as they are.
3. Copy the long ID from the sheet link: docs.google.com/spreadsheets/d/**THIS-PART**/edit. That is your `SHEET_ID`.

## Step 2. Let the website write to the sheet (one time, about 5 minutes)
1. Open console.cloud.google.com, make a new project, then search "Google Sheets API" and click Enable.
2. Go to IAM & Admin > Service Accounts > Create service account (any name, for example threadly). Skip the optional steps.
3. Open the new account > Keys > Add key > Create new key > JSON. A file downloads.
4. In that file, copy `client_email` (this is `GOOGLE_SERVICE_ACCOUNT_EMAIL`) and `private_key` (this is `GOOGLE_PRIVATE_KEY`).
5. In your Google Sheet click Share, paste the client_email, and give it **Editor** access.

## Step 3. Razorpay keys
Razorpay Dashboard > Account & Settings > API Keys > Generate. Start with **Test mode** keys (they start with `rzp_test_`). Later switch to live keys after Razorpay approves your KYC.

## Step 4. Deploy on Netlify
Netlify's drag-and-drop upload does not run the order and login functions, so deploy from GitHub (free):
1. Use the existing `jananisr2020/Threadly` GitHub repository and keep the monorepo layout intact. The root `netlify.toml` configures Netlify to build `threadly-v2/`; do not create a second repository just for this subfolder. Never commit `Threadly_Database.xlsx`, a `.env` file, private keys, or payment secrets.
2. On netlify.com: Add new site > Import an existing project > pick the repository. Leave the build settings as they are (netlify.toml has them). Deploy.
3. Site configuration > Environment variables, add these 10:

| Name | Value |
|---|---|
| SHEET_ID | from Step 1 |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | from Step 2 |
| GOOGLE_PRIVATE_KEY | the whole private_key text, including the BEGIN and END lines |
| RAZORPAY_KEY_ID | from Step 3 |
| RAZORPAY_KEY_SECRET | from Step 3 |
| JWT_SECRET | any long random sentence |
| ADMIN_PASSWORD | a strong password only you know |
| RAZORPAY_WEBHOOK_SECRET | from Step 5 |
| BREVO_API_KEY | from Step 6 |
| MAIL_FROM | the email address you verified in Brevo (Step 6) |

4. Deploys > Trigger deploy (so the new variables are picked up). Your store is live at the Netlify address.

## Step 5. Razorpay webhook (so no paid order is ever lost)
1. In the Razorpay Dashboard (Test Mode first): Account & Settings > Webhooks > Add new webhook.
2. Webhook URL: `https://YOUR-SITE.netlify.app/api/razorpay-webhook`
3. Secret: make up a password and keep it. This is `RAZORPAY_WEBHOOK_SECRET` (put the same value in Netlify).
4. Tick these events: `payment.captured`, `payment.failed`, `refund.processed`. Save.
5. If you already made your Google Sheet before this update, add one more tab named exactly **Pending** with these headings in row 1: `Razorpay Order ID`, `Order Data`, `Created`, `Status`. (The new `Threadly_Database.xlsx` already has it.)
6. When you refund a payment in Razorpay, the order's Payment Status turns to Refunded automatically.

## Step 6. Password-reset emails (free with Brevo)
1. Sign up at brevo.com (free plan sends 300 emails a day).
2. Senders, Domains & Dedicated IPs > Senders > Add a sender. Use your own email address and confirm the verification email. That address is `MAIL_FROM`.
3. SMTP & API > API Keys > Generate a new API key. That is `BREVO_API_KEY`.
4. Add both in Netlify and trigger a deploy. "Forgot password?" on the login box then emails a link that works for 30 minutes, once.

## Chat assistant
The 💬 button is a free, built-in assistant (no key or subscription needed). It answers delivery, returns, payment, coupon, size and gift questions, and finds products from sentences like "black earrings under ₹199" using your live product sheet. To change its answers, edit the `botRules` function in `public/index.html`.

## Reviews, cancellations, returns and refunds
- **Add two tabs** to your Google Sheet if it was made before this update (the new `Threadly_Database.xlsx` already has them). **Reviews** headings: `Review ID, Product ID, Name, Email, Rating, Comment, Date, Verified, Status`. **Requests** headings: `Request ID, Date, Order ID, Email, Type, Reason, Details, Status, Admin Notes`.
- **Reviews:** logged-in customers can review a product once. Reviews are marked Verified purchase when that customer ordered the product, and go live straight away. Hide any you do not want from Admin > Reviews.
- **Cancel:** a customer can cancel an order from their account. If it is still New, it cancels automatically. If it is Packed, the request goes to Admin > Returns for you to decide. Shipped orders cannot be cancelled.
- **Return:** possible once you set the order to Delivered. You check the 7-day window yourself, then set the request status (Approved, Pickup scheduled, Refunded and so on) and add a note the customer sees in their account.
- **Refund:** in Admin > Returns, the Refund button sends the full amount back through Razorpay for online-paid orders (it asks you to confirm first). Juno checkout supports online payment only; cash on delivery is disabled in both the storefront and API.
- **Stock** is not added back when an order is cancelled or returned. Update the stock number in the sheet.

## Tamil Nadu delivery, contact details, tickets and pincode autocomplete
- **Delivery area:** the store currently delivers only in **Tamil Nadu** (Coimbatore, Chennai and all other cities) and says other states are coming soon. A pincode outside Tamil Nadu is refused at checkout, and the server re-checks it, so it cannot be bypassed. When you expand, loosen the check in `buildOrder` (`tnPin`) in `netlify/lib/core.js` and the wording in the store and policy pages.
- **Pincode autocomplete:** type a pincode or an area name (for example "Ganapathy") in the header box, the product page or checkout, and matching areas appear. It uses the free India Post pincode directory (api.postalpincode.in) through your own `/api/pincode`, with results remembered for a day. If that service is down, it falls back to a Tamil Nadu pincode-range check.
- **Your phone and email:** change them in one place, `public/site-config.js`. They update in the footer, chat, ticket form and all policy pages. Also set the `SUPPORT_EMAIL` variable in Netlify (the inbox where new tickets are emailed). Create that email address first; I could not check which addresses are free.
- **Tickets (complaints and queries):** "Raise a ticket" is in the footer, the account page, the chat and the contact page. Guests can raise one with just an email. Each ticket is saved in a **Tickets** tab (add it with the headings `Ticket ID, Date, Type, Name, Email, Phone, Order ID, Message, Status, Admin Reply, Last Updated`; the new `Threadly_Database.xlsx` has it), emailed to `SUPPORT_EMAIL`, and the customer gets a confirmation email with their ticket number. Reply from Admin > Tickets: the customer is emailed your reply and logged-in customers also see it in their account. Emails need Brevo (Step 6); without it tickets are still saved.

## Marketplace homepage (how every section is built)
Nothing on the homepage is typed in by hand. Each section reads your product sheet, and a section simply does not appear when there is no real data for it.
- **Header and mega-menus:** Women, Men, Kids, Ethnic Wear, Footwear, Bags, Accessories and Sale. A group only appears if the sheet has products for it. Women/Men use the **For** column, the others match on category names. Edit the `GROUPS` list near the top of the homepage script in `public/index.html` to change the rules.
- **Hero and category tiles:** use the first product photo in each group (from the **Image** column), or a drawn placeholder until you add photos.
- **Shop by budget:** counts of real products at or under ₹99, ₹199 and ₹499.
- **Sale offers:** the largest real discount per category (selling price versus MRP). The only coupon promoted is JUNO10, which is real.
- **New collections / New arrivals:** the most recently added rows in your sheet.
- **Trending now / Bestsellers:** from real orders in the **Orders** tab (cancelled and returned orders are ignored; Trending looks at the last 14 days). They appear only after you have orders. Until then the page shows **Biggest savings** instead.
- **Everyday essentials:** the two lowest-priced products in each everyday category. Edit the `ESS` list to choose the categories.
- **Flash deals:** products you mark Flash Sale = Yes in the sheet.
- **Recently viewed:** from the shopper's own browser.
- **Stars and review counts:** shown only when real customers have reviewed a product. No ratings are made up.
- **Collections banners:** Hair accessories, Jewellery and Gifts under ₹299, built from your catalogue.
- **SEO:** page title and description, Open Graph tags, structured data for the business and for each opened product (price and stock only), a canonical link, `/sitemap.xml` (every visible product and policy page) and `/robots.txt` (blocks /admin and /api). Both are generated by `netlify/functions/seo.js` using your site address. After launch, submit `https://YOUR-SITE/sitemap.xml` in Google Search Console.
- **No new setup is needed:** no new Netlify variables and no new sheet tabs.

## Deploying as a brand-new Netlify site (clean start)
1. Unzip into a new empty folder, for example `C:\Users\janan\Downloads\threadly-v2`, and open that folder in VS Code.
2. Terminal: `npm install`, then `npm run check` (it must end with "Safe to deploy").
3. Create a file named `.env` in the folder with your values (see `.env.example`), one per line, as NAME=value. For `GOOGLE_PRIVATE_KEY` put the whole key on one line with `\n` where the line breaks are, inside double quotes.
4. Run `netlify login` if needed, then `netlify deploy --prod`. When asked, choose **Create & configure a new project**, pick your team, and type your new site name (for example `threadly-tn`). Netlify says if the name is taken.
5. Load your values into the new site: `netlify env:import .env` and then deploy once more with `netlify deploy --prod`. Environment variables belong to one site, so a new site needs them again.
6. Update the Razorpay webhook address to `https://YOUR-NEW-NAME.netlify.app/api/razorpay-webhook` (the secret stays the same).
7. Your Google Sheet, service account and Razorpay keys do not change. The old site is untouched; delete it in Netlify when you are happy with the new one.

## Before every deploy: check you are in the right folder
Run `npm run check` (or `node scripts/check-links.js`) in the folder you deploy from. It confirms all 8 pages and the 21 backend functions are present, that this is the latest version, and that every link leads to a real page. If it says "MISSING" or "OLD copy", you are in the wrong folder or the new files were not copied over. After `netlify deploy --prod`, scroll to the bottom of your live site: it shows `Build v2-2026-10-11`. If you still see "Deals end in" on the home page, the live site is an old deploy.

## Policy pages, cookie consent and your business details
- **Six finished pages** are in `public/`: `privacy-policy.html`, `terms.html`, `refund-policy.html` (returns, cancellations and refunds), `shipping-policy.html`, `cookie-policy.html` and `contact.html`. Each has full content, the same header and footer, and links to the others. There is no custom 404 page.
- **Your details in one place:** open `public/site-config.js` to change the phone, email, business name (`legalName`) and an optional `address`. They update on every policy page automatically. The address stays hidden until you fill it in.
- **Confirm these promises match how you really work** (they are written into the pages): orders handed to the courier within 1 to 2 working days; delivery 2-3 days in Chennai and Coimbatore and 3-5 days elsewhere in Tamil Nadu; 7-day returns; earrings and hair accessories returnable only if damaged or wrong; reports of damaged items within 48 hours; refunds in 5-7 working days; delivery fee ₹39 under ₹299. Edit the text in the page files if any differ. These pages are a solid starting point but not legal advice.
- **Cookie consent:** first-time visitors see a banner with **Accept all** or **Essential only**. Essential storage (login, cart, wishlist, the consent choice) always works. Recent searches, recently viewed items and the remembered pincode are saved on the device only after Accept all. "Cookie settings" in the footer and mobile menu reopens the choice, and `/?cookies=1` opens it directly.
- **Razorpay's script now loads only when someone presses Pay**, not on every page view, which matches the cookie policy.

## Cart, wishlist and security
- Cart, wishlist and coupon are now saved in the customer's browser, so they survive a refresh.
- Login, sign-up, password reset, admin login and ordering are rate-limited. This is best-effort on Netlify (each server instance keeps its own count), so keep ADMIN_PASSWORD strong.

## Using it
- **Store:** your-site.netlify.app. Products, categories, prices and stock come from the Products tab. Changes show within about a minute.
- **Admin:** your-site.netlify.app/admin. Log in with ADMIN_PASSWORD to see orders, set status and tracking numbers, add or edit products, and view customers. Everything is saved straight into the sheet.
- **Customers:** sign-ups and every login are recorded on the Users tab. Orders land on the Orders tab. Stock reduces automatically.
- **Photos:** upload images to a free host such as Cloudinary or Imgur and paste the link in the Image column (or in the admin form).

## Testing Razorpay safely
With test keys, choose UPI or Card at checkout. Razorpay's test window lets you use their test UPI ID `success@razorpay` and test cards from their docs, and no real money moves.

## If payment does not open
- The payment window needs the live Netlify address (https). It cannot work in a preview or a file opened from your computer.
- Check that both Razorpay variables are set, then trigger a new deploy.
- Turn off ad-blockers for the site.
- Netlify > Logs > Functions shows the exact error for create-order.

## Before taking real money
Add your refund, shipping and privacy policy pages and contact details (Razorpay asks for them), then switch to live keys. 

## Limits to know about
- Google Sheets allows roughly 60 reads per minute per account on this setup. That is fine for a small store with a few hundred visitors a day. If you grow beyond that, move to a real database and I can do it for you.
- A customer who pays but closes the browser before the confirmation will not have an order row. Razorpay still shows the payment in its dashboard; adding a Razorpay webhook closes that gap.
