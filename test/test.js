/* global describe it before after */

const Distri = require('../index.js')
const expect = require('chai').expect

describe('Server startup', () => {
  it('should start and close a server', (done) => {
    const server = new Distri.DistriServer({ connection: { port: 8080 } })
    expect(server).to.be.an('object')
    server.server.close(done)
  })
  it('should be able to start a server on the same port', (done) => {
    const server = new Distri.DistriServer({ connection: { port: 8080 } })
    expect(server).to.be.an('object')
    server.server.close(done)
  })
})

describe('Client connection', () => {
  it('should start a server, and have a client connect to it', (done) => {
    const server = new Distri.DistriServer({ connection: { port: 8080 } })
    const client = new Distri.DistriClient({ host: 'ws://localhost:8080' })
    client.client.on('message', (m) => {
      expect(m).to.be.a('string')
      client.client.close(4001, 'debug')
    })
    client.client.on('close', () => {
      server.server.close(done)
    })
  })
})

describe('Solution verification', () => {
  // here's where stuff gets serious
  console.log('gronkenstein')
  let server = new Distri.DistriServer({ connection: { port: 8080 }, security: { verificationStrength: 3 }, work: [1], files: { node: 'https://gist.githubusercontent.com/Flarp/5d213555e8215bcf45bd693c98cdc9ba/raw/ec590f80adc2f3de37d91801e0180c5cb6db9901/debug.js' } })
  let clients = Array(3)
  before(() => {
    console.log(server)
    clients.map((val, ind) => clients.push(new Distri.DistriClient({ host: 'ws://localhost:8080' })))
  })
  after((done) => {
    let finished = 0
    clients.map((val, ind) => {
      clients[ind].close(4001, 'debug')
      clients[ind].on('close', () => {
        finished++
        if (finished === 3) server.server.close(done)
      })
    })
  })
  describe('Accept work using Distri.EqualityPercentage', (done) => {
    server.on('workgroup_complete', (i, o, resolve, reject) => {
      Distri.CheckPercentage(o, 100, resolve, reject)
    })
    server.on('workgroup_accepted', () => done())
  })
  describe('Reject unequal work using Distri.EqualityPercentage', (done) => {
    server.addWork([2])
    server.on('workgroup_complete', (i, o, resolve, reject) => {
      Distri.CheckPercentage(o, resolve, reject)
    })
    server.on('workgroup_rejected', () => done())
  })
})
