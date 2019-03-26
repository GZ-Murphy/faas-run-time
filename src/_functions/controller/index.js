const app = require('../../app')
app.controller('hihi.version', async function version (ctx, next) {
    ctx.body = 'version is 3/26/2019, ';
	await next()
})
app.controller('hihi.method', async function method (ctx, next) {
    ctx.body += 'method:'+ctx.method +', '
	await next()
})

app.controller('hihi.getDate', async function getDate (ctx, next) {
    const today = await app.service.Date.getDate()
	ctx.body += 'Today is :'+ today+ ', '
	await next()
})  
  
app.controller('hihi.helloWold', async function helloWold (ctx, next) {
    ctx.body += 'and every thing i want to say is fuck you world!'
	
})    
  
