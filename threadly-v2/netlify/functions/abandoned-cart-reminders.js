const c = require('../lib/core');
exports.config = { schedule: '0 * * * *' };
exports.handler = async () => {
  try { return { statusCode: 200, body: JSON.stringify(await c.sendAbandonedCartReminders()) }; }
  catch (error) { console.error('Juno abandoned-cart reminder job failed:', error && error.message); return { statusCode: 500, body: 'Reminder job failed' }; }
};
