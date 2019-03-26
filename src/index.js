

const bodyParser = require('koa-bodyparser')
const CONFIG = require('./config')

const app = require('./app')

app.use(bodyParser({
    enableTypes: ['json'],
    extendTypes: ['application/json'],
    onerror: function (err, ctx) {
      ctx.throw('Body parse error', 422);
    }
  }))




app.listen(CONFIG.APP.port, CONFIG.APP.host);
console.log(`API Server started at http://${CONFIG.APP.host}:${CONFIG.APP.port}`);

module.exports = app;