const { publicList } = require('../lib/coupons');

exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60'
  },
  body: JSON.stringify({ coupons: publicList() })
});
