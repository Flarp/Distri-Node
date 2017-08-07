const chai = require('chai');
const expect = chai.expect;
const DistriServer = require('../index');
const WebSocket = require('ws');
const msgpack = require("msgpack-lite");
let server = new DistriServer(); 
server.start();

describe('Testing Distri.js', function() {
    let connection1,  connection2, randomValues;
    
    before(function() {
        connection1 = new WebSocket('ws://localhost:8080');
        connection2 = new WebSocket('ws://localhost:8080');           
        
        connection1.onopen = () => {
              connection1.send("hi");
         }
        
        connection2.onopen = () => {
              connection2.send("hi");
         }
        randomValues = [1,4,5,6,8,34,12,78,90]
    })


    it('check send basic functionality ', function() {      
        connection1.onmessage = (msg) => {
             expect(msgpack.decode(msg.data)).to.equal({ type: 0, file: '' });
         }
      
    });

    it('check addWork ', function() {
        let check = true;
        server.addWork(randomValues)
        server.session.forEach((worker,index) => {
            if(randomValues.indexOf(worker.work) == -1){
                check = false;
            }
        })
        expect(check).to.equal(true);
    });

    it('check number of expected clients', function() {
        expect(server.server.clients.length).to.equal(2);
       
    });

 
})