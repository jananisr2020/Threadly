#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright');

const root = path.resolve(__dirname, '../public');
const csv = fs.readFileSync(path.join(root, 'products.csv'), 'utf8');
const e2eCsv = csv.trimEnd() + '\nE2E001,E2E Broken Image Hair Clip,Hair Clips,Women,150,100,Metal acrylic,Pink|Black|Beige,http://127.0.0.1:1/missing.jpg,2,No,4.5,Yes\n';
const bundledCatalogue = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'));
const catalogueIds = new Set([...e2eCsv.trim().split('\n').slice(1).map(row => row.split(',')[0]), ...(bundledCatalogue.products || []).map(product => product.id)]);
let liveCatalogueAvailable = true;
let catalogueResponseDelayMs = 0;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (url.pathname === '/api/products' && req.method === 'GET') {
      if (!liveCatalogueAvailable) { res.writeHead(503); res.end(JSON.stringify({ ok: false, error: 'catalogue unavailable' })); return; }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      if (catalogueResponseDelayMs > 0) {
        setTimeout(() => { if (!res.destroyed && !res.writableEnded) res.end(e2eCsv); }, catalogueResponseDelayMs);
      } else res.end(e2eCsv);
      return;
    }
    if (url.pathname === '/api/pincode') {
      res.end(JSON.stringify({ ok: true, found: true, state: 'Tamil Nadu', district: 'Coimbatore', serviceable: true, areas: [{ name: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu' }] }));
      return;
    }
    if (url.pathname === '/api/ticket' && req.method === 'POST') {
      res.end(JSON.stringify({ ok: true, id: 'TK-E2E-EMAIL-FAIL', emailed: false }));
      return;
    }
    if (url.pathname === '/api/signals') {
      res.end(JSON.stringify({ ok: true, bestsellers: [], trending: [], popular: [], recent: [] }));
      return;
    }
    if (url.pathname === '/api/seller-products') {
      res.end(JSON.stringify({ ok: true, seller: { id: 'JSR-E2E', storeName: 'E2E Test Store', email: 'seller@example.com', city: 'Coimbatore', category: 'Hair accessories' }, products: [] }));
      return;
    }
    if (url.pathname === '/api/seller-orders') {
      res.end(JSON.stringify({ ok: true, orders: [] }));
      return;
    }
    res.end(JSON.stringify({ ok: true, reviews: [], orders: [], products: [], requests: [] }));
    return;
  }
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(root, '.' + requested);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  let browser;
  const pageErrors = [];
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#grid .p').length > 0, null, { timeout: 15000 });
    assert.ok(await page.locator('#grid .p').count() >= 12, 'storefront should render a useful product grid');
    // Validate installability metadata and both required Android raster icon sizes.
    const manifestResponse = await page.request.get(`http://127.0.0.1:${address.port}/manifest.webmanifest`);
    assert.equal(manifestResponse.status(), 200, 'PWA manifest should be served');
    const manifest = await manifestResponse.json();
    assert.equal(manifest.display, 'standalone', 'PWA should use standalone display');
    assert.ok(manifest.icons.some(icon => icon.src === '/icon-192.png' && icon.sizes === '192x192'), 'manifest should declare a 192px Android icon');
    assert.ok(manifest.icons.some(icon => icon.src === '/icon-512.png' && icon.sizes === '512x512'), 'manifest should declare a 512px Android icon');
    for (const iconPath of ['/icon-192.png', '/icon-512.png']) {
      const iconResponse = await page.request.get(`http://127.0.0.1:${address.port}${iconPath}`);
      assert.equal(iconResponse.status(), 200, iconPath + ' should exist');
      assert.ok((iconResponse.headers()['content-type'] || '').includes('image/png'), iconPath + ' should be served as PNG');
    }
    // Broken image fallback, low-stock messaging and product variant selection.
    await page.locator('#q').fill('E2E Broken Image Hair Clip');
    const brokenCard = page.locator('#grid .p[data-id="E2E001"]');
    await brokenCard.waitFor();
    await page.waitForFunction(() => {
      const image = document.querySelector('#grid .p[data-id="E2E001"] img');
      return !!image && image.complete;
    });
    assert.equal(await brokenCard.locator('img').evaluate(img => getComputedStyle(img).display), 'none', 'broken product images should fail gracefully');
    assert.match(await brokenCard.textContent(), /Only 2 left/, 'low stock should be visible');
    const brokenPopupPromise = page.waitForEvent('popup');
    await brokenCard.click();
    const detailPage = await brokenPopupPromise;
    await detailPage.waitForURL(/\/product\.html\?p=E2E001/, { timeout: 10000 });
    await detailPage.waitForSelector('#product .title');
    assert.ok((await detailPage.locator('#product .title').textContent()).includes('E2E Broken Image Hair Clip'), 'product card should open a dedicated detail page in a new tab');
    const displayedPriceText = await detailPage.locator('#product .price').textContent();
    const displayedPrice = displayedPriceText.replace(/[^0-9]/g, '');
    assert.ok(Number(displayedPrice) > 0, 'detail page should show the selling price; got ' + JSON.stringify(displayedPriceText));
    assert.match(await detailPage.locator('#product').textContent(), /Only 2 left|Limited availability/, 'detail page should show truthful low-stock status');
    await detailPage.locator('#delivery-pin').fill('641001');
    await detailPage.locator('#check-pin').click();
    await detailPage.waitForFunction(() => document.querySelector('#delivery-result')?.classList.contains('ok'));
    const productSchema = await detailPage.locator('#product-jsonld').evaluate(el => JSON.parse(el.textContent));
    assert.equal(productSchema['@type'], 'Product', 'product page should expose structured product metadata');
    assert.equal(productSchema.offers.price, displayedPrice, 'structured offer should match the displayed selling price');
    await detailPage.locator('#wishlist').click();
    assert.ok(await detailPage.evaluate(() => (JSON.parse(localStorage.getItem('tl_wl') || '[]')).includes('E2E001')), 'product detail page should add the product to wishlist');
    await detailPage.locator('#wishlist').click();
    assert.ok(!(await detailPage.evaluate(() => JSON.parse(localStorage.getItem('tl_wl') || '[]').includes('E2E001'))), 'product detail page should remove the product from wishlist');
    const variants = detailPage.locator('#options .option');
    assert.ok(await variants.count() >= 3, 'product detail page should show available colour variants');
    await variants.first().click();
    assert.ok((await variants.first().getAttribute('class')).includes('on'), 'selected variant should be visibly indicated');
    await detailPage.waitForSelector('#product .fallback', { timeout: 5000 });
    await detailPage.close();
    await page.locator('#q').fill('');
    await page.waitForTimeout(300);
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const accessibilityBlockers = accessibility.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (accessibilityBlockers.length) {
      throw new Error('Accessibility blockers: ' + JSON.stringify(accessibilityBlockers.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map(n => n.target) }))));
    }

    // Search suggestions and keyboard selection.
    await page.locator('#q').fill('Pastel Hair Clip');
    await page.waitForSelector('#sg.show');
    assert.ok(await page.locator('#sg .si').count() > 0, 'search should show suggestions');
    await page.locator('#q').press('ArrowDown');
    await page.locator('#q').press('Enter');
    await page.waitForTimeout(300);
    assert.ok(await page.locator('#grid .p').count() > 0, 'keyboard search selection should render results');
    await page.locator('#q').fill('zz-no-such-juno-product-934');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#grid .p').count(), 0, 'unmatched search should show an empty state');
    assert.match(await page.locator('#grid').textContent(), /No matches/i);

    // Category navigation and sort should keep the grid functional.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    const category = page.locator('#chips .chip').nth(1);
    await category.click();
    await page.waitForTimeout(100);
    assert.ok(await page.locator('#grid .p').count() > 0, 'category selection should retain matching products');
    await page.locator('#mp').selectOption('200');
    await page.waitForTimeout(100);
    assert.ok(await page.locator('#grid .p').count() > 0, 'category plus max-price filter should retain matching products');
    await page.locator('#mp').selectOption('99999');
    for (const sort of ['rel', 'new', 'pop', 'best', 'lo', 'hi', 'rt', 'dc']) {
      await page.locator('#sort').selectOption(sort);
      await page.waitForTimeout(50);
      assert.ok(await page.locator('#grid .p').count() > 0, 'sort option should keep products visible: ' + sort);
    }

    // Wishlist persistence across a reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    const wishlistButton = page.locator('#grid .p').first().locator('[data-w]');
    await wishlistButton.click();
    await page.waitForFunction(() => document.querySelector('#wc').textContent === '1');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#wc').textContent === '1');
    const wishlist = await page.evaluate(() => JSON.parse(localStorage.getItem('tl_wl') || '[]'));
    assert.equal(wishlist.length, 1, 'wishlist should persist in local storage');
    await page.locator('#grid .p').first().locator('[data-w]').click();
    await page.waitForFunction(() => document.querySelector('#wc').textContent === '0');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('tl_wl') || '[]')), [], 'wishlist removal should persist');

    // Add to cart (choose a colour/size if the product requires one) and verify persistence.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    const quickPopupPromise = page.waitForEvent('popup', { timeout: 2500 }).catch(() => null);
    await page.locator('#grid .p').first().locator('[data-qa]').click();
    const quickPopup = await quickPopupPromise;
    if (quickPopup) {
      await quickPopup.waitForSelector('#product .title');
      const sizeChoice = quickPopup.locator('#options .option').first();
      if (await sizeChoice.count()) await sizeChoice.click();
      await quickPopup.locator('#add').click();
      await quickPopup.close();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#grid .p');
    }
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '1');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '1');
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('tl_cart') || '[]'));
    assert.equal(cart.reduce((sum, item) => sum + Number(item.n || 0), 0), 1, 'cart quantity should persist across reload');
    await page.locator('#cb').click();
    await page.waitForSelector('#cov.show');
    await page.locator('#cart [data-u]').first().click();
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '2');
    await page.locator('#cart [data-d]').first().click();
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '1');
    await page.locator('#cart [data-d]').first().click();
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '0', null, { timeout: 3000 });

    // Product details and compare limit/summary.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    // Consent to optional local storage in this test so recently viewed data persists across reload.
    await page.evaluate(() => localStorage.setItem('tl_cookie', JSON.stringify('all')));
    const viewedId = await page.locator('#grid .p').first().getAttribute('data-id');
    const viewedPopupPromise = page.waitForEvent('popup');
    await page.locator('#grid .p').first().click();
    const viewedPage = await viewedPopupPromise;
    await viewedPage.waitForSelector('#product .title');
    assert.ok((await viewedPage.locator('#product .title').textContent()).trim().length > 0, 'product details should open in a dedicated tab');
    await viewedPage.close();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    const recentlyViewed = page.locator('section[aria-label="Recently viewed"] .p');
    await recentlyViewed.first().waitFor({ timeout: 5000 });
    assert.ok(await page.locator(`section[aria-label="Recently viewed"] .p[data-id="${viewedId}"]`).count() > 0, 'recently viewed rail should show the actual product opened');
    for (const railName of ['Everyday essentials', 'Bestsellers', 'New arrivals']) {
      const railCards = page.locator(`section[aria-label="${railName}"] .p`);
      const count = await railCards.count();
      if (count) {
        const ids = await railCards.evaluateAll(cards => cards.map(card => card.getAttribute('data-id')));
        assert.equal(new Set(ids).size, ids.length, railName + ' must not repeat a product within its rail');
        for (const id of ids) {
          assert.ok(id && catalogueIds.has(id), railName + ' must use a real catalogue product ID');
        }
      }
    }
    const compareData = await page.locator('#grid .p').evaluateAll(cards => cards.slice(0, 4).map(card => ({ id: card.getAttribute('data-id'), name: card.querySelector('h3')?.textContent.trim() })));
    assert.ok(compareData.length >= 4, 'compare test requires four products');
    for (const item of compareData.slice(0, 3)) await page.locator(`#grid [data-cmp="${item.id}"]`).click();
    await page.waitForSelector('#cmpbar');
    assert.match(await page.locator('#cmpbar').textContent(), /Compare \(3\)/);
    await page.locator(`#grid [data-cmp="${compareData[3].id}"]`).click();
    assert.match(await page.locator('#cmpbar').textContent(), /Compare \(3\)/, 'compare selection must remain capped at three products');
    await page.locator('#cmpbar').click();
    await page.waitForSelector('#aov.show');
    const comparison = await page.locator('#auth table').textContent();
    for (const item of compareData.slice(0, 3)) assert.ok(comparison.includes(item.name), 'comparison should include ' + item.name);
    for (const field of ['Price', 'MRP', 'Rating', 'Sizes/colors', 'Stock']) assert.ok(comparison.includes(field), 'comparison should show ' + field);

    // Address book is device-local, scoped by signed-in email, and supports add/edit/remove/select.
    const addressContext = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    const addressPage = await addressContext.newPage();
    addressPage.on('pageerror', error => pageErrors.push(error.message));
    await addressPage.addInitScript(() => {
      localStorage.setItem('tl_cookie', JSON.stringify('all'));
      localStorage.setItem('tl_session', JSON.stringify({ name: 'E2E Buyer', email: 'buyer@example.com', token: 'e2e-customer-token' }));
    });
    await addressPage.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    await addressPage.waitForSelector('#grid .p');
    const addressProductId = await addressPage.locator('#grid .p').first().getAttribute('data-id');
    await addressPage.evaluate(id => localStorage.setItem('tl_cart', JSON.stringify([{ id, n: 1, s: 'One Size' }])), addressProductId);
    await addressPage.reload({ waitUntil: 'domcontentloaded' });
    await addressPage.waitForSelector('#grid .p');
    await addressPage.locator('#cb').click();
    await addressPage.waitForSelector('#cov.show');
    await addressPage.locator('#co').click();
    await addressPage.waitForSelector('#pov.show');
    await addressPage.locator('#dn').fill('E2E Buyer');
    await addressPage.locator('#dp').fill('9876543210');
    await addressPage.locator('#da').fill('12 Test Street, Coimbatore');
    await addressPage.locator('#dz').fill('641001');
    await addressPage.locator('#dlabel').selectOption('Home');
    await addressPage.locator('#ddefault').check();
    await addressPage.locator('#addrSave').click();
    await addressPage.waitForFunction(() => document.querySelector('#saved-addresses')?.textContent.includes('E2E Buyer'));
    assert.equal(await addressPage.evaluate(() => JSON.parse(localStorage.getItem('juno_addresses_buyer@example.com') || '[]').length), 1, 'saved address should persist under the signed-in email');
    await addressPage.locator('[data-address-edit]').first().click();
    await addressPage.locator('#dn').fill('E2E Buyer Updated');
    await addressPage.locator('#addrSave').click();
    await addressPage.waitForFunction(() => document.querySelector('#saved-addresses')?.textContent.includes('E2E Buyer Updated'));
    await addressPage.locator('[data-address-select]').first().click();
    assert.ok(await addressPage.locator('.addr-card.selected').count() > 0, 'selected address should be visibly indicated');
    await addressPage.locator('[data-address-delete]').first().click();
    await addressPage.waitForFunction(() => document.querySelector('#saved-addresses')?.textContent.includes('No saved addresses yet'));
    assert.equal(await addressPage.evaluate(() => JSON.parse(localStorage.getItem('juno_addresses_buyer@example.com') || '[]').length), 0, 'removed address should be deleted from the local address book');
    await addressContext.close();

    // Mobile layout must not overflow the viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    const mobileNavigationTiming = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav ? { domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd), loadEventMs: Math.round(nav.loadEventEnd) } : null;
    });
    const catalogueBytes = (await (await page.request.get(`http://127.0.0.1:${address.port}/catalog.json`)).body()).length;
    assert.ok(mobileNavigationTiming && mobileNavigationTiming.domContentLoadedMs > 0 && mobileNavigationTiming.domContentLoadedMs < 10000,
      'mobile storefront DOM should become ready within 10 seconds; measured ' + JSON.stringify(mobileNavigationTiming));
    assert.ok(catalogueBytes < 1500000, 'catalogue static payload must stay below 1.5 MB before compression; got ' + catalogueBytes);
    process.stdout.write('✓ mobile performance budget: DOMContentLoaded ' + mobileNavigationTiming.domContentLoadedMs + 'ms; catalogue ' + catalogueBytes + ' bytes\\n');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    assert.equal(overflow, false, 'mobile storefront should not have horizontal page overflow');
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    // Open the product card itself so the test exercises the same detail flow as a shopper.
    const mobilePopupPromise = page.waitForEvent('popup');
    await page.locator('#grid .p').first().click();
    const mobilePage = await mobilePopupPromise;
    await mobilePage.waitForSelector('#product .title');
    const mobileSize = mobilePage.locator('#options .option').first();
    if (await mobileSize.count()) await mobileSize.click();
    await mobilePage.locator('#add').click();
    assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false, 'mobile product detail should not overflow');
    await mobilePage.close();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '1', null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false, 'mobile cart state should not overflow');
    await page.locator('#cb').click();
    await page.waitForSelector('#cov.show');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false, 'mobile cart drawer should not overflow');
    await page.locator('#co').click();
    await page.waitForFunction(() => !!document.querySelector('#aov.show') || !!document.querySelector('#pov.show'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false, 'mobile checkout/login step should not overflow');
    await page.goto(`http://127.0.0.1:${address.port}/sell-on-juno.html`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false, 'seller application page should fit mobile viewport');
    const applicationAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const applicationBlockers = applicationAxe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (applicationBlockers.length) throw new Error('Seller application accessibility blockers: ' + JSON.stringify(applicationBlockers.map(v => ({ id: v.id, help: v.help, nodes: v.nodes.slice(0, 3).map(n => n.target) }))));
    await page.goto(`http://127.0.0.1:${address.port}/seller-studio.html`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false, 'seller studio should fit mobile viewport');
    const studioAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const studioBlockers = studioAxe.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (studioBlockers.length) throw new Error('Seller Studio accessibility blockers: ' + JSON.stringify(studioBlockers.map(v => ({ id: v.id, help: v.help, nodes: v.nodes.slice(0, 3).map(n => n.target) }))));
    const sellerSessionPage = await context.newPage();
    sellerSessionPage.on('pageerror', error => pageErrors.push(error.message));
    await sellerSessionPage.route('**/api/seller-products', async route => {
      const request = route.request();
      const body = JSON.parse(request.postData() || '{}');
      const data = body.action === 'profile'
        ? { ok: true, seller: { storeName: 'E2E Seller Store' } }
        : body.action === 'load' ? { ok: true, products: [] } : { ok: true };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await sellerSessionPage.route('**/api/seller-orders', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, orders: [] }) }));
    await sellerSessionPage.addInitScript(() => { if (!sessionStorage.getItem('e2eSellerSessionSeeded')) { sessionStorage.setItem('junoSellerToken', 'e2e-seller-session'); sessionStorage.setItem('e2eSellerSessionSeeded', '1'); } });
    await sellerSessionPage.goto(`http://127.0.0.1:${address.port}/seller-studio.html`, { waitUntil: 'domcontentloaded' });
    await sellerSessionPage.waitForFunction(() => !document.querySelector('#studio').classList.contains('hidden'));
    await sellerSessionPage.locator('#logout').click();
    await sellerSessionPage.waitForFunction(() => !sessionStorage.getItem('junoSellerToken') && !document.querySelector('#auth').classList.contains('hidden'));
    assert.equal(await sellerSessionPage.evaluate(() => sessionStorage.getItem('junoSellerToken')), null, 'seller logout must clear the session token');
    await sellerSessionPage.close();

    // A saved support ticket must not claim an email was sent when the email provider reports failure.
    await page.goto(`http://127.0.0.1:${address.port}/?ticket=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tov.show #tks');
    await page.locator('#tkn').fill('E2E Test Buyer');
    await page.locator('#tke').fill('ticket-buyer@example.com');
    await page.locator('#tkg').fill('Please help me check a test order confirmation.');
    await page.locator('#tks').click();
    await page.waitForFunction(() => document.querySelector('#tkm h3')?.textContent.includes('TK-E2E-EMAIL-FAIL'));
    const ticketConfirmation = await page.locator('#tkm').textContent();
    assert.match(ticketConfirmation, /could not send a confirmation email/i);
    assert.match(ticketConfirmation, /Keep this ticket ID/i);
    assert.doesNotMatch(ticketConfirmation, /A confirmation email has been sent/i);

    // If the live catalogue fails, the bundled preview is explicitly labelled and checkout stays disabled.
    liveCatalogueAvailable = false;
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#catalogue-sync-notice');
    assert.match(await page.locator('#catalogue-sync-notice').textContent(), /saved catalogue only/i);
    await page.waitForSelector('#grid .p');
    const fallbackPopupPromise = page.waitForEvent('popup', { timeout: 2500 }).catch(() => null);
    await page.locator('#grid .p').first().locator('[data-qa]').click();
    const fallbackPopup = await fallbackPopupPromise;
    if (fallbackPopup) {
      await fallbackPopup.waitForSelector('#product .title');
      const fallbackSize = fallbackPopup.locator('#options .option').first();
      if (await fallbackSize.count()) await fallbackSize.click();
      await fallbackPopup.locator('#add').click();
      await fallbackPopup.close();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#grid .p');
    }
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '1');
    await page.locator('#cb').click();
    await page.waitForSelector('#cov.show');
    await page.locator('#co').click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#aov.show').count(), 0, 'fallback catalogue must not proceed into checkout/login');
    assert.equal(await page.locator('#pov.show').count(), 0, 'fallback catalogue must not proceed into checkout');
    // The preview warning must offer a retry and recover when the live catalogue returns.
    liveCatalogueAvailable = true;
    await page.locator('#retry-live-catalogue').click();
    await page.waitForFunction(() => !document.querySelector('#catalogue-sync-notice'));
    assert.ok(await page.locator('#grid .p').count() > 0, 'catalogue retry should restore products');
    // A slow catalogue request must time out to the saved preview rather than hang indefinitely.
    catalogueResponseDelayMs = 600;
    await page.addInitScript(() => { window.JUNO_CATALOGUE_TIMEOUT_MS = 250; });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#catalogue-sync-notice');
    assert.match(await page.locator('#catalogue-sync-notice').textContent(), /saved catalogue only/i);
    await page.waitForSelector('#grid .p');
    catalogueResponseDelayMs = 0;
    await page.locator('#retry-live-catalogue').click();
    await page.waitForFunction(() => !document.querySelector('#catalogue-sync-notice'));
    // Verify the installed service worker keeps the storefront shell usable after the network disappears.
    await context.setOffline(false);
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) throw new Error('Service workers are unavailable in the browser test');
      await navigator.serviceWorker.ready;
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 5000 });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 8000 });
    await page.waitForSelector('#grid .p', { timeout: 5000 });
    assert.match(await page.title(), /Juno/i, 'offline navigation should serve the cached Juno shell');
    await context.setOffline(false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p', { timeout: 10000 });
    assert.deepEqual(pageErrors, [], 'storefront and seller pages should not throw uncaught JavaScript errors');
    process.stdout.write('✓ storefront browser smoke tests passed (search, category, sort, wishlist, cart, product detail, compare, mobile)\n');
  } catch (error) {
    process.stderr.write((error && error.stack) || String(error));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();
