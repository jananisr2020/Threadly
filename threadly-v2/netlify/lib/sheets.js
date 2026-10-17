// Thin wrapper over the Google Sheets REST API (service account login).
const { JWT } = require('google-auth-library');
let client;
const c = () => client || (client = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
}));
const base = () => `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}`;
const enc = encodeURIComponent;
exports.read = async tab => (await c().request({ url: `${base()}/values/${enc(tab)}` })).data.values || [];
exports.append = (tab, row) => c().request({ url: `${base()}/values/${enc(tab + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, method: 'POST', data: { values: [row] } });
exports.update = (tab, rowNum, row) => c().request({ url: `${base()}/values/${enc(tab + '!A' + rowNum)}?valueInputOption=RAW`, method: 'PUT', data: { values: [row] } });

// Create marketplace tabs on first use so the owner does not need to add them manually.
// Existing tabs and data are preserved; headers are written only when a tab is empty.
exports.ensureTab = async (tab, headers) => {
  if (!process.env.SHEET_ID) throw new Error('SHEET_ID is not configured');
  const meta = async () => (await c().request({
    url: `${base()}?fields=sheets.properties.title`
  })).data.sheets || [];
  let names = (await meta()).map(s => s.properties && s.properties.title).filter(Boolean);
  if (!names.includes(tab)) {
    try {
      await c().request({
        url: `${base()}:batchUpdate`,
        method: 'POST',
        data: { requests: [{ addSheet: { properties: { title: tab } } }] }
      });
    } catch (err) {
      // A concurrent first request may have created the same tab; only suppress that case.
      names = (await meta()).map(s => s.properties && s.properties.title).filter(Boolean);
      if (!names.includes(tab)) throw err;
    }
  }
  const rows = await exports.read(tab);
  if (!rows.length) {
    await c().request({
      url: `${base()}/values/${enc(tab + '!A1')}?valueInputOption=RAW`,
      method: 'PUT',
      data: { values: [headers] }
    });
  }
  return true;
};
