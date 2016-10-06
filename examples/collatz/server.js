const distri = require('../../index.js')

let arr = [];

for (let x = 2; x < 100; x++) {
    arr.push(x)
}

const Server = new distri.DistriServer({port:8081,work:arr})

Server.on('workgroup_complete', (i,o) => {
    console.log(`Number ${i} took ${o} steps using the Collatz conjecture to reach 1.`)
})

Server.on('all_work_complete', () => {
    console.log('Well, what next?')
    Server.server.close(() => {
        
    })
})