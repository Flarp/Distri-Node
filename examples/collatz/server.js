const distri = require('../../index.js')

let arr = []

for (let x = 2; x < 10; x++) {
  arr.push(x)
}

const Server = new distri.DistriServer({
  connection: {
    port: 8081
  },

  security: {
    verificationStrength: 1
  },

  files: {
    'javascript': 'gist.githubusercontent.com/Flarp/d75e5676179442516ef9458e5ecc32cb/raw/87241d2d5c84006d95f89aaee230644ac3e11899/javascript-collatz.js',
    'node': 'https://gist.githubusercontent.com/Flarp/e08a9dc96dfe19264052c14773f6d0d4/raw/2f629e8409c4022e67b215778c1a98b575b6079d/node-collatz.js'
  }

})

Server.addWork(arr)

Server.on('workgroup_complete', (i, o, res, rej) => {
  console.log(i, o[0])
  res(o[0])
})

Server.on('all_work_complete', () => {
  console.log('Well, what next?')
  Server.server.close(() => {

  })
})


