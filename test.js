const distri = require('./index.js')

const Server = new distri.DistriServer({host:8081,mode:{typing:'static',input:'UInt32',output:'UInt32'},work:[1]})