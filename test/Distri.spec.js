const chai = require('chai');
const expect = chai.expect;
const DistriServer = require('../index');
const ws = require('ws');

describe('Testing Distri.js', function() {
    let classInvocation;
    beforeEach(function() {
        classInvocation = new DistriServer();  
    })

    it('check all aspects of the constructor function', function() {
        expect(typeof classInvocation).to.equal("object");
        expect(classInvocation.options.connection.port).to.equal(8080);
        expect(classInvocation.options.verificationStrength).to.equal(1);   
    });

    it('check getIndex Function', function() {
        expect(classInvocation.getIndex()).to.not.equal(-1);  
    });

    it('check addWork Function', function() {
        console.log(classInvocation.addWork([]))
        //expect(classInvocation.serveUser(ws)).to.equal(-1);  
    });

 
})