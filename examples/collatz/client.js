const distri = require('../../index.js')

const Client = new distri.DistriClient({host:'ws://localhost:8081'})

Client.on('work', (work, submit) => {
    console.log(work)
    let temp = work;
    let num = 0;
    while (temp !== 1) {
        // if temp is divisible by two
        if (temp % 2 == 0) { 
            temp /= 2
        } else {
            // if not
            temp *= 3
            temp++
        }
        num++
    }
    submit(num)
})