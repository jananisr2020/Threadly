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
