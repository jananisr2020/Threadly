const c=require('../lib/core');
exports.handler=c.wrap('GET',c.myTickets,'user');
