const msg = require('msgpack')

process.stdout.write('ready')
process.stdin.resume();

process.stdin.on('data', (m) => {
    const message = msg.unpack(m)
    process.stdin.end();
    let num = message.data
    for (let x = 1; x < message.data; x++) {
        num *= x
    }
    process.stdout.write(msg.pack({data:num}))
})