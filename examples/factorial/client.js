const distri = require('../../index.js')

const Client = new distri.DistriClient({host:'ws://localhost:8081'})

Client.on('work', (work, submit) => {
    let num = work
    for (let x = 1; x < work; x++) {
        num *= x
    }
    console.log(`Number ${work} factorial is ${num}`)
    submit(num)
})