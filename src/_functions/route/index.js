const app = require('../../app')

  app.route('hihi',{
    method: 'post',
    controller:[
	app.controller.hihi.version,
	app.controller.hihi.method,
	app.controller.hihi.getDate,
	app.controller.hihi.helloWold
	] 
  })
  app.route('hihi',{
    method: 'get',
    controller:[
	app.controller.hihi.version,
	app.controller.hihi.method,
	app.controller.hihi.getDate,
	app.controller.hihi.helloWold
	] 
  })
  
