const distri = require('../../index.js')

let arr = [];

const express = require('express');
const app = express()


app.use(express.static('../../../distri-js'))

app.listen(process.env.PORT)

for (let x = 2; x < 10000; x++) {
    arr.push(x)
}

const Server = new distri.DistriServer({
    connection:{
        port:8081
    },
    
    work:arr,
    
    mode: {
        typing: 'static',
        input: {
            type: 'UInt',
            byteLength: 2
        },
        
        output: {
            type: 'UInt',
            byteLength: 4
        }
    },
    
    files: {
        'javascript': 'https://cdn.rawgit.com/Flarp/d75e5676179442516ef9458e5ecc32cb/raw/4cc3424ec842db2f64bdcab2ec51faa5e4a06b43/javascript-collatz.js'
    }
    
})

Server.on('workgroup_complete', (i,o) => {
    console.log(`Number ${i} took ${o} steps using the Collatz conjecture to reach 1.`)
})

Server.on('all_work_complete', () => {
    console.log('Well, what next?')
    Server.server.close(() => {
        
    })
})