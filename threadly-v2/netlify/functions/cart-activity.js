const c = require('../lib/core');
exports.handler = c.wrap('POST', c.cartActivity, 'user');
