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
let liveCatalogueAvailable = true;
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
      res.end(e2eCsv);
      return;
    }
    if (url.pathname === '/api/pincode') {
      res.end(JSON.stringify({ ok: true, found: true, state: 'Tamil Nadu', district: 'Coimbatore', serviceable: true, areas: [{ name: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu' }] }));
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
    await brokenCard.click();
    await page.waitForSelector('#mov.show');
    assert.ok((await page.locator('#modal').textContent()).includes('E2E Broken Image Hair Clip'));
    const variants = page.locator('#modal .sz button');
    assert.ok(await variants.count() >= 3, 'product details should show available colour variants');
    await variants.first().click();
    assert.ok((await variants.first().getAttribute('class')).includes('on'), 'selected variant should be visibly indicated');
    await page.locator('#mov [data-close]').click();
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
    await page.locator('#grid .p').first().locator('[data-qa]').click();
    if (await page.locator('#mov.show').count()) {
      const sizeChoice = page.locator('#modal .sz button').first();
      if (await sizeChoice.count()) await sizeChoice.click();
      await page.locator('#add').click();
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
    await page.locator('#grid .p').first().click();
    await page.waitForSelector('#mov.show');
    assert.ok((await page.locator('#modal h2').first().textContent()).trim().length > 0, 'product details should open');

    await page.locator('#mov [data-close]').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
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

    // Mobile layout must not overflow the viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    assert.equal(overflow, false, 'mobile storefront should not have horizontal page overflow');
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    await page.locator('#grid .p').first().locator('[data-qa]').click();
    if (await page.locator('#mov.show').count()) {
      const mobileSize = page.locator('#modal .sz button').first();
      if (await mobileSize.count()) await mobileSize.click();
      await page.locator('#add').click();
    }
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '1');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false, 'mobile product/cart state should not overflow');
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
    await sellerSessionPage.addInitScript(() => sessionStorage.setItem('junoSellerToken', 'e2e-seller-session'));
    await sellerSessionPage.goto(`http://127.0.0.1:${address.port}/seller-studio.html`, { waitUntil: 'domcontentloaded' });
    await sellerSessionPage.waitForFunction(() => !document.querySelector('#studio').classList.contains('hidden'));
    await sellerSessionPage.locator('#logout').click();
    await sellerSessionPage.waitForFunction(() => !sessionStorage.getItem('junoSellerToken') && !document.querySelector('#auth').classList.contains('hidden'));
    assert.equal(await sellerSessionPage.evaluate(() => sessionStorage.getItem('junoSellerToken')), null, 'seller logout must clear the session token');
    await sellerSessionPage.close();

    // If the live catalogue fails, the bundled preview is explicitly labelled and checkout stays disabled.
    liveCatalogueAvailable = false;
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#catalogue-sync-notice');
    assert.match(await page.locator('#catalogue-sync-notice').textContent(), /saved catalogue only/i);
    await page.waitForSelector('#grid .p');
    await page.locator('#grid .p').first().locator('[data-qa]').click();
    if (await page.locator('#mov.show').count()) {
      const fallbackSize = page.locator('#modal .sz button').first();
      if (await fallbackSize.count()) await fallbackSize.click();
      await page.locator('#add').click();
    }
    await page.waitForFunction(() => document.querySelector('#cc').textContent === '1');
    await page.locator('#cb').click();
    await page.waitForSelector('#cov.show');
    await page.locator('#co').click();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#aov.show').count(), 0, 'fallback catalogue must not proceed into checkout/login');
    assert.equal(await page.locator('#pov.show').count(), 0, 'fallback catalogue must not proceed into checkout');
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
