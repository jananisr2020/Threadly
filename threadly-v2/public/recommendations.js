'use strict';

/**
 * Rank catalogue items for the product-detail “People also viewed” rail.
 * This is a catalogue-similarity recommendation, not a claim that these exact
 * products were viewed by other shoppers. It uses only public product fields.
 *
 * @param {object} current - Product currently displayed.
 * @param {object[]} products - Public catalogue products.
 * @param {number} limit - Maximum recommendations to return.
 * @returns {object[]} A new array of ranked products, excluding the current item.
 */
function rankRelatedProducts(current, products, limit = 4) {
  if (!current || !Array.isArray(products)) return [];
  const currentId = String(current.id ?? '');
  const clean = value => String(value ?? '').trim().toLowerCase();
  const currentCategory = clean(current.cat || current.category);
  const currentPrice = Number(current.price) || 0;
  const fields = ['brand', 'material', 'style', 'occasion', 'type', 'productType', 'color', 'colour'];
  const eligible = products.filter(item => {
    if (!item || !item.id || String(item.id) === currentId) return false;
    const price = Number(item.price);
    if (!Number.isFinite(price) || price <= 0 || price > 500) return false;
    if (clean(item.showOnSite || 'yes') === 'no') return false;
    if (item.hidden === true || item.approved === false || clean(item.status) === 'hidden') return false;
    return true;
  });
  const score = item => {
    const category = clean(item.cat || item.category);
    let points = 0;
    if (currentCategory && category === currentCategory) points += 12;
    for (const field of fields) {
      const a = clean(current[field]);
      const b = clean(item[field]);
      if (a && b && a === b) points += field === 'brand' ? 2 : 3;
    }
    if (currentPrice > 0) {
      const relativeGap = Math.abs(Number(item.price) - currentPrice) / currentPrice;
      if (relativeGap <= 0.2) points += 4;
      else if (relativeGap <= 0.4) points += 2;
    }
    return points;
  };
  const ranked = eligible.map((item, index) => ({
    item, index, score: score(item),
    gap: Math.abs((Number(item.price) || 0) - currentPrice)
  })).sort((a, b) => b.score - a.score || a.gap - b.gap || String(a.item.id).localeCompare(String(b.item.id)) || a.index - b.index);
  const max = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : 4;
  return ranked.slice(0, max).map(entry => entry.item);
}

if (typeof module !== 'undefined' && module.exports) module.exports = { rankRelatedProducts };
if (typeof window !== 'undefined') window.JunoRecommendations = { rank: rankRelatedProducts };
