const expect = require('chai').expect
const distri = require('../index.js')

describe('Distri-Node tests', () => {
    describe('Server Tests (part 1)', () => {
        it('should start a server', (done) => {
            const Server = new distri.DistriServer({port:8081})
            expect(Server).to.be.an('object')
            Server.server.close(done)
        })
    })
    describe('Server Tests (part 2)', () => {
        let Server, Client;
        before(() => {
            Server = new distri.DistriServer({port:8081})
            Client = new distri.DistriClient({host:'ws://localhost:8081'})
        })
        
        after((done) => {
            Client.client.close(() => {
                Server.server.close(done)
            })
        })
        
        it('should start a Server and a Client', () => {
            expect(Client).to.be.an('object')
            expect(Server).to.be.an('object')
        })
    })
})