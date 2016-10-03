const ws = require('ws')
const msg = require('msgpack')
const defaults = require('deep-defaults')
const EventEmitter = require('events').EventEmitter
const idgen = require('idgen')
const hashcash = require('hashcashgen')

class DistriServer extends EventEmitter {
    constructor(opts) {
        super()
        if (opts.constructor.name !== 'Object') throw new TypeError('Options must be given in the form of an object')
        
        this.options = defaults(opts, {
            port: 8080,
            
            security: {
                verificationStrength: 1,
                hashStrength: 3,
                equalityPercentage: 100,
                minUsers: 1,
                strict: false
            },
            
            work: [1]
        })
        
        this.server = new ws.Server({port:this.options.port})
        
        this.solutions = 0;
        this.fullProblems = 0;
        this.userCount = 0;
        this.userQueue = [];
        
        this.session = this.options.work.map(work => {
            return {workers:0, work:work, solutions:[]}
        })
        
        const d = new Date()
        
        let usingEmpty = false
        
        const empty = new Float32Array(Math.ceil(this.session.length/20))
        
        setInterval(() => {
            if (!usingEmpty && (this.session.length*(19/20))<this.solutions) {
                let lastInd = -1;
                this.session.map((val, ind) => val.solution.length !== this.options.security.verificationStrength ? empty[lastInd++] = ind : null )
            }
        }, 120000)
        
        const randomIndGenerator = () => {
            
            let index;
            
            if (usingEmpty) {
                let temp = Math.floor(Math.random() * empty.length)
                index = empty[temp]
            } else {
                index = Math.floor(Math.random() * this.session.length)
            }
            if(this.solutions === this.options.work.length || this.fullProblems === this.options.work.length) return -1
            return ((this.session[index].workers + this.session[index].solutions.length) >= this.options.security.verificationStrength)
            ? randomIndGenerator()
            : index
        }
        
        this.server.on('connection', (ws) => {
            let ind;
            let gen = idgen()
            this.userCount++
            
            if (this.userCount < this.options.security.minUsers) {
                this.userQueue.push(ws)
            } else {
                this.userQueue.map(user => user.send(msg.pack({responseType:'request'}), {binary:true}))
                this.userQueue = [];
                ws.send(msg.pack({responseType:'request'}), {binary:true})
            }
            
            ws.on('message', (m) => {
                
                
                if (m.constructor !== Buffer) {
                    if(this.options.security.strict) ws.close()
                    return;
                }
                
                const message = msg.unpack(m);
                
                
                if ((message.constructor !== Object) || !message.response || !message.responseType) {
                    if(this.options.security.strict) ws.close()
                    return;
                }
                
                switch(message.responseType) {
                    case "request":
                        ws.send(msg.pack({data:[gen,this.options.security.hashStrength],responseType:'submit_hash'}), {binary:true})
                        break;
                    case "submit_hash":
                        if(hashcash.check(gen, this.options.security.hashStrength, message.response)) {
                            gen = idgen()
                            ind = randomIndGenerator()
                            if (ind === -1) {
                                ws.send(msg.pack({error:'No work available'}))
                            } else {
                                this.session[ind].workers++
                                ws.send(msg.pack({responseType:'submit_work', work:this.session[ind].work}))
                            }
                            
                        } else if (this.options.security.strict) ws.close()
                        
                        break;
                        
                    case 'submit_work':
                        if (!message.response) {
                            if (this.options.security.strict) ws.close()
                            return;
                        }
                        this.session[ind].solutions.push(message.response)
                        this.session[ind].workers-- 
                        ws.send(msg.pack({responseType:'request'}), {binary:true})
                        if (this.session[ind].solutions.length === this.options.security.verificationStrength) {
                            const init = this.session[ind].solutions[0]
                            if (this.session[ind].solutions.every(solution => solution === init)) {
                                this.emit('workgroup_complete', this.session[ind].work, init)
                                this.solutions++
                                if (this.solutions === this.session.length) {
                                    this.session = [];
                                    this.emit('all_work_complete')
                                }
                            } else {
                                const check = new Map()
                                this.session[ind].solutions.map(solution => Map.has(solution) ? Map.set(solution, Map.get(solution) + 1) : Map.set(solution, 1))
                                let greatest = {solution:null,hits:0};
                                
                                for (let [key,val] of check) {
                                    if (val > greatest.hits) greatest = {solution:key,hits:val}
                                }
                                
                            }
                        }
                        break;
                        
                }
                
                
                
                
                
            })
            
            ws.on('close', () => {
                this.userCount--
                if (ind !== -1) {
                    this.session[ind].workers--
                }
            })
        })
    }
}

module.exports.DistriServer = DistriServer