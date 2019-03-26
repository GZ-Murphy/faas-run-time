const app = require('../../app')

app.service('Date', {
    async getDate () {
      return new Date();
    }
  })
  
