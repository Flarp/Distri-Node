const distri = require('../../index.js')

let arr = [];

for (let x = 2; x < 10; x++) {
    arr.push(x)
}

const Server = new distri.DistriServer({
    port:8081,
    
    work:arr,
    
    mode:{
        typing:'static',
        input:{
            type:'UInt',
            byteLength:1
        },
        
        output:{
            type:'UInt',byteLength:4
        }},
    files: {
        node: 'https://drive.google.com/uc?export=download&id=0BwAlDZA3kaQAdGNSZUtTdmlfSU0'
    }    
})

Server.on('workgroup_complete', (i,o) => {
    console.log(`Number ${i} factorial is ${o}`)
})

Server.on('all_work_complete', () => {
    console.log('Well, what next?')
    Server.server.close(() => {
        
    })
})