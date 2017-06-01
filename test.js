const Distri = require('./index.js')
const server = new Distri({ connection: { port: 8082 } } )
server.start()
server.addWork([1,2,3,4,5])
