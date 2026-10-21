#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../public');
const csv = fs.readFileSync(path.join(root, 'products.csv'), 'utf8');
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
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.end(csv);
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
    await page.locator('#sort').selectOption('new');
    await page.waitForTimeout(100);
    assert.ok(await page.locator('#grid .p').count() > 0, 'sorting should keep products visible');

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

    // Product details and compare limit/summary.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    await page.locator('#grid .p').first().click();
    await page.waitForSelector('#mov.show');
    assert.ok((await page.locator('#modal h2').first().textContent()).trim().length > 0, 'product details should open');

    await page.locator('#mov [data-close]').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    const ids = await page.locator('#grid .p').evaluateAll(cards => cards.slice(0, 4).map(card => card.getAttribute('data-id')));
    assert.ok(ids.length >= 4, 'compare test requires four products');
    for (const id of ids.slice(0, 3)) await page.locator(`#grid [data-cmp="${id}"]`).click();
    await page.waitForSelector('#cmpbar');
    assert.match(await page.locator('#cmpbar').textContent(), /Compare \(3\)/);
    await page.locator(`#grid [data-cmp="${ids[3]}"]`).click();
    assert.match(await page.locator('#cmpbar').textContent(), /Compare \(3\)/, 'compare selection must remain capped at three products');

    // Mobile layout must not overflow the viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#grid .p');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    assert.equal(overflow, false, 'mobile storefront should not have horizontal page overflow');
    assert.deepEqual(pageErrors, [], 'storefront should not throw uncaught JavaScript errors');
    process.stdout.write('✓ storefront browser smoke tests passed (search, category, sort, wishlist, cart, product detail, compare, mobile)\n');
  } catch (error) {
    process.stderr.write((error && error.stack) || String(error));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();
