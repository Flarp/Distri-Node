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
        
        // explained in the README
        this.options = defaults(opts, {
            port: 8080,
            
            security: {
                verificationStrength: 1,
                hashStrength: 3,
                equalityPercentage: 100,
                minUsers: 1,
                strict: false
            },
            
            mode: {
                typing: 'dynamic',
                input: {
                    type: 'Int',
                    byteLength: 4
                },
                output: {
                    type: 'Int',
                    byteLength: 4
                },
                endianess: 'BE',
            },
            
            work: [1]
        })
        
        this.server = new ws.Server({port:this.options.port})
        
        // a number of the solved problems
        this.solutions = 0;
        
        // a number of problems with the maximum of clients and
        // a number of solved problems
        this.fullProblems = 0;
        
        // how many connected users there are
        this.userCount = 0;
        
        // A cue of websocket client objects if the
        // user count is not met.
        this.userQueue = [];
        
        const workLength = this.options.work.length;
        
        // where the work is stored, along with all its metadata
        let addSolution;
        let read;
        if (this.options.mode.typing === 'dynamic') {
            this.session = this.options.work.map(work => {
                return {workers:0, work:work, solutions:[],solutionCount:0} 
                // solutionCount is to make sure the API for static and dynamic are the same
            })
        } else if (this.options.mode.typing === 'static') {
            if (this.options.work[0].constructor === 'Array')
                throw new TypeError('There cannot be arrays inside arrays as of now')
            if (!this.options.work.every(work => work.constructor === this.options.work[0].constructor))
                throw new TypeError('All entries in work array must be of the same type in static typing')
                
            const workSize = (() => {
                switch(this.options.work[0].constructor) {
                    case String:
                        return Math.ceil((this.options.work.reduce((pre, cur) => {
                            Math.max(pre.length, cur.length) === pre.length ? pre : cur
                        }).length)/4)
                    default:
                        return this.options.mode.input.byteLength
                }
            })();    
            
            const solutionSize = this.options.mode.output.byteLength
            
            const endianess = this.options.mode.endianess
            
            const totalSize = 2+workSize+(solutionSize * this.options.security.verificationStrength)
            
            this.buffer = Buffer.allocUnsafe(totalSize * this.options.work.length)
            for (let x = 0; x < this.options.work.length; x++) {
                this.buffer.writeUInt8(0, x*totalSize)
                this.buffer[`write${this.options.mode.input.type}${endianess}`](this.options.work[x], (x*totalSize)+1, workSize, this.options.work[0].constructor === String ? 'ucs2' : false)
                this.buffer.writeUInt8(0, (1+(x*totalSize)+workSize))
                for (let z = 0; z < this.options.security.verificationStrength; z++) {
                    this.buffer[`write${this.options.mode.output.type}${endianess}`](this.options.work[0].constructor === String ? '' : 0, (2+(x*totalSize)+workSize), workSize, this.options.work[0].constructor === String ? 'ucs2' : false)
                }
                
                
            }
            
            const solProx = {
                get: (targ, key) => {
                    
                    let returnVal = [];
                    for (let q = 0; q < this.options.security.verificationStrength; q++) {
                        returnVal.push(targ[`read${this.options.mode.output.type}${endianess}`](q*solutionSize, solutionSize))
                    } 
                    return returnVal[key]
                },
                set: (targ, key, val) => {
                    targ[`write${this.options.mode.output.type}${endianess}`](val, key*solutionSize, solutionSize)
                    return 1;
                }
            }
            
            const bufProx = {
                get: (targ, key) => {
                    switch(key) {
                        case 'workers':
                            return targ.readInt8(0)
                        case 'work':
                            return targ[`read${this.options.mode.input.type}${endianess}`](1, workSize)
                        case 'solutionCount':
                            return targ.readUInt8(1+workSize)
                        case 'solutions':
                            return new Proxy(targ.slice((2+workSize), (2+workSize)+(solutionSize*this.options.security.verificationStrength)), solProx)
                    }
                },
                set: (targ, key, val) => {
                    switch(key) {
                        case 'workers':
                            targ.writeUInt8(val, 0)
                            return 1;
                        case 'solutionCount':
                            targ.writeUInt8(val, (1+workSize))
                            return 1;
                    }
                }
            }
            const arrProx = {
                get: (target, ind) => {
                    let index;
                    try {
                        index = parseInt(ind)
                    } catch(e) {
                        return 0
                    }
                    if (isNaN(index)) {
                        return workLength
                    } else {
                        return new Proxy(this.buffer.slice((index * totalSize), ((index+1) * totalSize)), bufProx)
                    }
                }
            }
            
            this.session = new Proxy({}, arrProx)
            this.options.work = undefined;
            
        } else {
            throw new Error('Typing must be either "static" or "dynamic"')
        }
        
        /*
          * To speed things up, when only 5% of work is left, an array of the indexes of available work
          * is created. Trying to get a random index in an array with only one available
          * will take a very long time. 
         */
        const empty = new Int32Array(Math.ceil(this.session.length/20))
        
        // is the above array being used in place of randomly generating indexes?
        let usingEmpty = false
        
        setInterval(() => {
            // check every two minutes of there is less than 5% of work left
            if (!usingEmpty && (this.session.length*(19/20))<this.solutions) {
                let lastInd = -1;
                this.session.map((val, ind) => val.solution.length !== this.options.security.verificationStrength ? empty[lastInd++] = ind : null )
            }
        }, 120000)
        
        const randomIndGenerator = () => {
            
            let index;
            
            if (this.session.length === 0) return -1
            
            if (usingEmpty) {
                // if we are using the empty array
                let temp = Math.floor(Math.random() * empty.length)
                index = empty[temp]
            } else {
                // get a random index from the session array.
                index = Math.floor(Math.random() * this.session.length)
            }
            // if everything is full
            if(this.fullProblems >= this.session.length) return -1
            return ((this.session[index].workers + this.session[index].solutionCount) >= this.options.security.verificationStrength)
            ? randomIndGenerator() // get another random index if that problem is full
            : index // return that index
        }
        
        this.server.on('connection', (ws) => {
            // Generate a starting index in the session array. Starting at -1
            // will let the server know if someone unverified is trying to 
            // request work
            let ind = -1;
            let stage = 0;
            // generate something random for later on
            let gen = idgen()
            this.userCount++
            
            // if the minimum user count has not been met
            if (this.userCount < this.options.security.minUsers) {
                // queue the user 
                this.userQueue.push(ws)
            } else {
                // tell each user in the queue that they can now request
                this.userQueue.map(user => user.send(msg.pack({responseType:'request'}), {binary:true}))
                this.userQueue = [];
                ws.send(msg.pack({responseType:'request'}), {binary:true})
                stage = 1;
            }
            
            ws.on('message', (m) => {
                
                if (m.constructor !== Buffer) {
                    if(this.options.security.strict) ws.close()
                    return;
                }
                
                const message = msg.unpack(m);
                // if anything is wrong with the message
                if ((message.constructor !== Object) || !message.response || !message.responseType) {
                    // kick the user if the server is using strict mode
                    if(this.options.security.strict) ws.close()
                    return;
                }
                switch(message.responseType) {
                    case "request":
                        if (stage !== 1) { // if the user is not at the correct stage
                            if(this.options.security.strict) ws.close() // kick the user if strict mode is on
                            return;
                        }
                        ws.send(msg.pack({data:[gen,this.options.security.hashStrength],responseType:'submit_hash'}))
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
                            
                        } else if (this.options.security.strict) {
                            // if the hash is wrong and strict mode is on.
                            ws.close();
                            return;
                        } else return;
                        
                        break;
                        
                    case 'submit_work':
                        if (!message.response) {
                            if (this.options.security.strict) ws.close()
                            return;
                        }
                        const index = ind;
                        ind = -1
                        gen = idgen()
                        if (this.options.mode.typing === 'dynamic') {
                            this.session[index].solutions.push(message.response)
                        } else {
                            try {
                                this.session[index].solutions[(this.session[index].solutionCount)] = message.response
                            } catch(e) {
                                console.log(e)
                                if (this.options.security.strict) ws.close()
                                return;
                            }
                        }
                        this.session[index].solutionCount++
                        
                        this.session[index].workers-- 
                        ws.send(msg.pack({responseType:'request'}), {binary:true})
                        if (this.session[index].solutions.length === this.options.security.verificationStrength) {
                            const init = this.session[index].solutions[0]
                            if (this.session[index].solutions.every(solution => solution === init)) {
                                this.emit('workgroup_complete', this.session[index].work, init)
                                this.solutions++
                                if (this.solutions === this.session.length) {
                                    this.session = [];
                                    this.emit('all_work_complete')
                                }
                            } else {
                                const check = new Map()
                                this.session[index].solutions.map(solution => Map.has(solution) ? Map.set(solution, Map.get(solution) + 1) : Map.set(solution, 1))
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

class DistriClient extends EventEmitter {
    constructor(opts) {
        super()
        if(opts.constructor.name !== 'Object') throw new TypeError('Options must be in the form of an object')
        this.onwork = function(){}
        this.options = defaults(opts, {
            host: 'ws://localhost:8081',
            availableMethods: ['Node', 'JavaScript']
        })
        
        this.client = new ws(this.options.host)
        const submit = (work) => {
            this.client.send(msg.pack({
                        responseType: 'submit_work',
                        response: work
                }))
        }
        
        this.client.on('open', () => {
            this.client.send(msg.pack({responseType:'request'}))
        });
        this.client.on('message', (m) => {
            const message = msg.unpack(m)
            switch(message.responseType) {
                case 'request':
                    this.client.send(msg.pack({response:true,responseType:'request'}))
                    break;
                case 'submit_hash':
                    this.client.send(msg.pack({
                        responseType: 'submit_hash',
                        response: hashcash(message.data[0], message.data[1])
                    }))
                    break;
                case 'submit_work':
                    this.emit('work', message.work, submit) 
                    break;
            }
        })
    }
}

module.exports.DistriClient = DistriClient