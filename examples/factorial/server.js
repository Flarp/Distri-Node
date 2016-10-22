const distri = require('../../index.js')

let arr = [];


for (let x = 2; x < 10; x++) {
    arr.push(x)
}

const Server = new distri.DistriServer({
    connection: {
        port: 8081,
    },
    
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
        node: 'https://drive.google.com/uc?export=download&id=0BwAlDZA3kaQAdGNSZUtTdmlfSU0',
        javascript: 'https://cdn.rawgit.com/Flarp/1f3eb1f2ff14b6d1f4d583e75592db71/raw/daf9b708ea2b788ea185447ddd239b5d3ff43282/javascript-factorial.js'
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