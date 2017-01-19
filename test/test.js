/* global describe it before after */

const Distri = require('../index.js')
const DistriServer = Distri.DistriServer
const DistriClient = Distri.DistriClient
const expect = require('chai').expect

describe('Server startup', () => {
  it('should start and close a server', (done) => {
    const server = new DistriServer({ connection: { port: 8080 } })
    expect(server).to.be.an('object')
    server.server.close(done)
  })
  it('should be able to start a server on the same port', (done) => {
    const server = new DistriServer({ connection: { port: 8080 } })
    expect(server).to.be.an('object')
    server.server.close(done)
  })
})

describe('Client connection', () => {
  it('should start a server, and have a client connect to it', (done) => {
    const server = new DistriServer({ connection: { port: 8081 } })
    const client = new DistriClient({ host: 'ws://localhost:8081' })
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
  let server
  let client
  before(() => {
    server = new DistriServer({ connection: { port: 8082 }, security: { verificationStrength: 3 }, work: [1], files: { node: 'https://gist.github.com/Flarp/5d213555e8215bcf45bd693c98cdc9ba' } })
    client = new DistriClient({ host: 'ws://localhost:8082' })
  })
  it('should accept work that is the same throughout', (done) => {
    server.on('workgroup_complete', (input, output, resolve, reject) => {
      Distri.CheckPercentage(output, 100, done, null)
      server.removeAllListeners('workgroup_complete')
    })
  })
  it('should reject work that is different throughout', (done) => {
    server.addWork([2])
    server.on('workgroup_complete', (input, output, resolve, reject) => {
      Distri.CheckPercentage(output, 100, null, done)
      server.removeAllListeners('workgroup_complete')
    })
  })
  it('should accept the most popular solution in a set', (done) => {
    server.addWork([3])
    server.on('workgroup_complete', (input, output, resolve, reject) => {
      Distri.CheckPercentage(output, 0, resolve, reject)
      server.removeAllListeners('workgroup_complete')
    })
    server.on('workgroup_accepted', (i, o) => {
      if (o === 1) done()
    })
  })
  after((done) => {
    client.client.close(4001, 'debug')
    client.client.on('close', () => {
      server.server.close(done)
    })
  })
})
