const distri = require('../../index.js')

let arr = [];


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
        'javascript': 'cdn.rawgit.com/Flarp/d75e5676179442516ef9458e5ecc32cb/raw/5d523ebd760d3cf3d1f38ea34751bb55c660bfcc/javascript-collatz.js',
        'node': 'https://cdn.rawgit.com/Flarp/e08a9dc96dfe19264052c14773f6d0d4/raw/8f124d6f51fc93b1ffb3b795411b464f4e20c187/node-collatz.js'
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