const Distri = require('../index.js')
const server = new Distri({
  connection: {
    port: 8081
  },
  file: 'gist.githubusercontent.com/Flarp/d75e5676179442516ef9458e5ecc32cb/raw/87241d2d5c84006d95f89aaee230644ac3e11899/javascript-collatz.js',
  verificationStrength: 3
})

server.on('work_submitted', (i, o, res, rej) => {
  console.log(i, o)
  res(o[0])
})

server.on('workgroup_complete', (i, o, res, rej) => {
  console.log(i, o)
  res()
})

server.on('all_work_complete', () => {
  console.log('restarting')
  server.addWork([ 2, 3, 4, 5, 6, 7, 8, 9 ])
})

server.addWork([ 2, 3, 4, 5, 6, 7, 8, 9 ])
