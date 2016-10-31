const ws = require('ws')
const defaults = require('deep-defaults')
const EventEmitter = require('events').EventEmitter
const idgen = require('idgen')
const hashcash = require('hashcashgen')
const bs = require('binarysearch')

class DistriServer extends EventEmitter {
    constructor(opts) {
        super()
        if (opts.constructor.name !== 'Object') throw new TypeError('Options must be given in the form of an object')
        
        const priorities = ['gcc','g++','node','javascript']
        
        // explained in the README
        this.options = defaults(opts, {
            connection: {
                port: 8080,
            },
            
            security: {
                verificationStrength: 1,
                hashStrength: 3,
                equalityPercentage: 100,
                minUsers: 1,
                strict: false,
                timeout: 0
            },
            
            files: {
                
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
        
        const order = priorities.filter(priority => this.options.files[priority])
        
        
        this.server = new ws.Server(this.options.connection)
        
        // a number of the solved problems
        this.solutions = 0;
        
        
        // how many connected users there are
        this.userCount = 0;
        
        // A cue of websocket client objects if the
        // user count is not met.
        this.userQueue = [];
        
        
        
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
                
            this.bufferInit = (work) => {
                const workLength = work.length;
                const workSize = (() => {
                switch(work[0].constructor.name) {
                    case "String":
                        return Math.ceil((work.reduce((pre, cur) => {
                            Math.max(pre.length, cur.length) === pre.length ? pre : cur
                        }).length)/4)
                    case "Float":
                        return 4;
                    case "Double":
                        return 8;
                    default:
                        return this.options.mode.input.byteLength
                }
            })();    
            
            const solutionSize = (() => {
                switch(this.options.mode.output.type) {
                    case "Float":
                        return 4;
                    case "Double":
                        return 8;
                    default:
                        return this.options.mode.output.byteLength
                }
            })();
            
            const endianess = this.options.mode.endianess
            
            const totalSize = 2+workSize+(solutionSize * this.options.security.verificationStrength)
            
            this.buffer = Buffer.allocUnsafe(totalSize * work.length)
            
            const midArg = this.options.mode.output.type === 'Double' || this.options.mode.output.type === 'Float' ? false : solutionSize
            
            for (let x = 0; x < work.length; x++) {
                this.buffer.writeUInt8(0, x*totalSize)
                switch(this.options.mode.input.type) {
                    case 'UInt':
                    case 'Int':
                        this.buffer[`write${this.options.mode.input.type}${endianess}`](work[x], (x*totalSize)+1, this.options.mode.input.byteLength)
                        break;
                    case '':
                        this.buffer[`write${this.options.mode.input.type}${endianess}`](work[x], (x*totalSize)+1, this.options.mode.input.byteLength, 'usc2')
                        break;
                    case 'Float':
                    case 'Double':
                        this.buffer[`write${this.options.mode.input.type}${endianess}`](work[x], (x*totalSize)+1)
                        break;
                }
                this.buffer.writeUInt8(0, (1+(x*totalSize)+workSize))
                for (let z = 0; z < this.options.security.verificationStrength; z++) {
                    switch(this.options.mode.input.type) {
                        case 'UInt':
                        case 'Int':
                            this.buffer[`write${this.options.mode.input.type}${endianess}`](work[x], (x*totalSize)+1, this.options.mode.input.byteLength)
                            break;
                        case '':
                            this.buffer[`write${this.options.mode.input.type}${endianess}`]('', (2+(x*totalSize)+workSize), workSize, 'usc2')
                            break;
                        case 'Float':
                        case 'Double':
                            this.buffer[`write${this.options.mode.input.type}${endianess}`](work[x], (x*totalSize)+1)
                            break;
                    }
                    this.buffer[`write${this.options.mode.output.type}${endianess}`](work[0].constructor === String ? '' : 0, (2+(x*totalSize)+workSize), workSize, work[0].constructor.name === "String" ? 'ucs2' : false)
                }
                
                
            }
            
            const solProx = {
                get: (targ, key) => {
                    const returnVal = [];
                    for (let q = 0; q < this.options.security.verificationStrength; q++) {
                        returnVal.push(targ[`read${this.options.mode.output.type}${endianess}`](q*solutionSize, midArg))
                    } 
                    return returnVal[key]
                },
                set: (targ, key, val) => {
                    targ[`write${this.options.mode.output.type}${endianess}`](val, key*solutionSize, midArg)
                    return 1;
                }
            }
            
            const bufProx = {
                get: (targ, key) => {
                    let tempArg = this.options.mode.input.type === 'Double' || this.options.mode.input.type === 'Float' ? false : workSize
                    switch(key) {
                        case 'workers':
                            return targ.readUInt8(0)
                        case 'work':
                            return targ[`read${this.options.mode.input.type}${endianess}`](1, tempArg)
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
        }    
                
        this.bufferInit(this.options.work)
            
        } else {
            throw new Error('Typing must be either "static" or "dynamic"')
        }
        
        this.remaining = [];
        for (let i = 0; i < this.options.work.length; i++) {
            this.remaining.push(i)
        }
        
        this.options.work = undefined;
        
        const randomIndGenerator = () => {
            let index;
            
            if (this.session.length === 0) return -1
                // get a random index from the session array.
                index = this.remaining[Math.floor(Math.random() * this.remaining.length)]
            // if everything is full
            if(this.remaining.length === 0) {
                return -1
            } else {
                return index;
            }
            
        }
        
        let maxTime = 0;
        
        this.server.on('connection', (ws) => {
            
            // time the user started computing the problem
            let start;
            
            // time the user returned the result
            let end;
            
            // initialize the setTimeout for kicking the user
            let timeout;
            
            
            // Generate a starting index in the session array. Starting at -1
            // will let the server know if someone unverified is trying to 
            // request work
            let sentFile = false;
            let ind = -1;
            // generate something random for later on
            let gen = idgen()
            this.userCount++
            
            // if the minimum user count has not been met
            if (this.userCount < this.options.security.minUsers) {
                // queue the user 
                this.userQueue.push(ws)
            } else {
                // tell each user in the queue that they can now request
                this.userQueue.map(user => user.send(JSON.stringify({responseType:'request'})))
                this.userQueue = [];
                ws.send(JSON.stringify({responseType:'request'}))
            }
            
            ws.on('message', (m) => {
                if (this.userCount < this.options.security.minUsers) {
                    if (this.options.security.strict) {
                        ws.close()
                    }
                    return;
                }
                let message;
                
                try {
                    message = JSON.parse(m);
                } catch (e) {
                    if (this.options.security.strict) ws.close()
                    return;
                }
                
                // if anything is wrong with the message
                if ((message.constructor !== Object) || !message.response || !message.responseType) {
                    // kick the user if the server is using strict mode
                    if(this.options.security.strict) ws.close()
                    return;
                }
                switch(message.responseType) {
                    case "request":
                        if (sentFile === false) {
                            let avail
                            
                            try {
                               avail = message.response.reduce((pre, cur) => order.indexOf(cur) < order.indexOf(pre) ? cur : pre)
                            } catch (e) {
                                if (this.options.security.strict) ws.close()
                                return;
                            }
                                 
                            if (order.indexOf(avail) === -1) {
                                    ws.send(JSON.stringify({error:'No work available for supported settings'}))
                                    ws.close()
                                    return;
                                }
                                ws.send(JSON.stringify({responseType:'file',response:[this.options.files[avail],avail]}))
                            }
                        break;
                    case 'request_hash':
                        ws.send(JSON.stringify({responseType:'submit_hash',response:[gen,this.options.security.hashStrength]}))
                        break;
                    case "submit_hash":
                        if(hashcash.check(gen, this.options.security.hashStrength, message.response)) {
                            gen = idgen()
                            ind = randomIndGenerator()
                            if (ind === -1) {
                                ws.send(JSON.stringify({error:'No work available'}))
                            } else {
                                this.session[ind].workers++
                                if (this.options.security.timeout) {
                                    timeout = setTimeout(() => {
                                        ws.close()
                                    }, this.options.security.timeout*1000)
                                }
                                start = Date.now()
                                ws.send(JSON.stringify({responseType:'submit_work', workType: [this.options.mode.output.type,this.options.mode.output.endianess,this.options.mode.output.byteLength],work:this.session[ind].work}))
                                if (this.session[ind].workers + this.session[ind].solutionCount === this.options.security.verificationStrength && bs(this.remaining, ind) !== -1) {
                                    this.remaining.splice(bs(this.remaining, ind), 1)
                                }
                            }
                            
                        } else {
                            // if the hash is wrong and strict mode is on.
                            if (this.options.security.strict) ws.close();
                            return;
                        } 
                        
                        break;
                        
                    case 'submit_work':
                        if (!message.response) {
                            if (this.options.security.strict) ws.close()
                            return;
                        }
                        
                        if (this.options.security.timeout) {
                            clearTimeout(timeout)
                        }
                        
                        end = Date.now()
                        
                        if (maxTime < end-start) maxTime = end-start
                        
                        const index = ind;
                        
                        ind = -1
                        gen = idgen()
                        if (this.options.mode.typing === 'dynamic') {
                            this.session[index].solutions.push(message.response)
                        } else {
                            try {
                                this.session[index].solutions[(this.session[index].solutionCount)] = message.response
                            } catch(e) {
                                if (this.options.security.strict) ws.close()
                                return;
                            }
                        }
                        
                        this.session[index].solutionCount++
                        
                        this.session[index].workers-- 
                        
                        ws.send(JSON.stringify({responseType:'submit_hash',response:[gen,this.options.security.hashStrength]}))
                        if (this.session[index].solutionCount === this.options.security.verificationStrength) {
                            const init = this.session[index].solutions[0]
                            if (this.session[index].solutions.every(solution => solution === init)) {
                                this.emit('workgroup_complete', this.session[index].work, init)
                                if (this.options.security.dynamicTimeouts) {
                                    this.options.security.timeout = maxTime/1000
                                }
                                if (bs(this.remaining, index) !== -1) this.remaining.splice(bs(this.remaining,index), 1)
                                this.solutions++
                                if (this.solutions === this.session.length) {
                                    this.session = [];
                                    this.emit('all_work_complete')
                                    this.solutions = 0;
                                }
                            } else {
                                const check = new Map()
                                this.session[index].solutions.map(solution => check.has(solution) ? check.set(solution, check.get(solution) + 1) : check.set(solution, 1))
                                let greatest = {solution:null,hits:0};
                                for (let [key,val] of check) {
                                    if (val > greatest.hits) greatest = {solution:key,hits:val}
                                }
                                
                                if ((greatest.hits/this.options.security.verificationStrength)>=(this.options.security.equalityPercentages/100)) {
                                    this.emit('workgroup_complete', this.session[index].work, init)
                                    if (this.options.security.dynamicTimeouts) {
                                        this.options.security.timeout = maxTime/1000
                                    }
                                    if (bs(this.remaining, index) !== -1) this.remaining.splice(bs(this.remaining,index), 1)
                                    this.solutions++
                                    if (this.solutions === this.session.length) {
                                        this.session = [];
                                        this.emit('all_work_complete')
                                        this.solutions = 0;
                                    }
                                } else {
                                    this.session[index].solutions.forEach(solution => solution = 0)
                                    this.session[index].workers = 0;
                                    this.session[index].solutionCount = 0;
                                    if (bs(this.remaining, index) === -1) {
                                        bs.insert(this.remaining, index)
                                    }
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
    
    addWork(work) {
        if (work.constructor.name !== 'Array') throw new TypeError('Added work must be in the form of an array')
        
        switch(this.options.mode.typing) {
            case 'dynamic':
                work.map(work => {
                    this.remaining.push(this.session.push({work,solutions:[],workers:0,solutionCount:0})-1)
                })
                this.remaining.sort((a, b) => {
                    if (a > b) {
                        return 1
                    } else {
                        return -1
                    }
                })
                break;
            case 'static':
                this.bufferInit(work)
                this.remaining = [];
                for (let i = 0; i < work.length; i++) {
                    this.remaining.push(i)
                }
                break;
        }
    }
}

module.exports.DistriServer = DistriServer

class DistriClient {
    constructor(opts) {
        
        const filename = idgen()
        const onDeath = require('death')
        
        if(opts.constructor.name !== 'Object') throw new TypeError('Options must be in the form of an object')
        const spawn = require('child_process').spawn
        const request = require('request')
        const fs = require('fs')
        this.options = defaults(opts, {
            host: 'ws://localhost:8081',
            availableMethods: ['gcc', 'javascript']
        })
        
        this.client = new ws(this.options.host)
        const submit = (work) => {
            this.client.send(JSON.stringify({
                        responseType: 'submit_work',
                        response: work
                }))
        }
        
        const file = fs.createWriteStream(`./${filename}`)
        let runner;
        
        onDeath((sig, err) => {
            if (runner) runner.kill('SIGINT')
            fs.unlinkSync(`./${filename}`)
        })
        
        
        
        this.client.on('open', () => {
            this.client.send(JSON.stringify({responseType:'request',response:['node']}))
        });
        this.client.on('message', (m) => {
            const message = JSON.parse(m)
            switch(message.responseType) {
                case 'file':
                    request(message.response[0]).pipe(file).on('close', () => {
                        runner = spawn(message.response[1], [`./${filename}`] , {stdio:['pipe','pipe','pipe']})
                        runner.stdout.on('data', (data) => {
                             if(data.toString() === 'ready') {
                                 this.client.send(JSON.stringify({response:true,responseType:'request_hash'}))
                             } else {
                                 submit(JSON.parse(data).data)
                             }
                        })
                    })
                    break;
                case 'submit_hash':
                    this.client.send(JSON.stringify({
                        responseType: 'submit_hash',
                        response: hashcash(message.response[0], message.response[1])
                    }))
                    break;
                case 'submit_work':
                    runner.stdin.write(JSON.stringify({data:message.work}))
                    break;
            }
        })
    }
}

module.exports.DistriClient = DistriClient

