/**
  @module Distri-Node
*/

const WebSocket = require('ws')
const defaults = require('deep-defaults')
const EventEmitter = require('events').EventEmitter
const bs = require('binarysearch')

/**
    * Constructor for DistriServer.
    * @constructor
    * @throws {TypeError} Options sent to the constructor are not in a single object.
    * @extends EventEmitter
    *
    * @param {Object} opts - The object passed to the constructor.
    * @param {Object} opts.connection - Options for a ws.Server constructor. (websockets/ws)
    * @param {number} opts.verificationStrength - How many solutions must be submitted for a problem to be considered complete. Security measure to help keep clients from spamming incorrect answers.
    * @param {Object} opts.files - URL's to files for Distri clients to fetch.
    * @param {string} opts.files.node - File to fetch for Node.js clients, not prepended with 'http(s)://'.
    * @param {string} opts.files.javascript - File to fetch for JavaScript clients, not prepended with 'http(s)://'.
    *
    * @emits DistriServer#event:work_submitted
    * @emits DistriServer#event:workgroup_complete
    * @emits DistriServer#event:workgroup_accepted
    * @emits DistriServer#event:workgroup_rejected
    * @emits DistriServer#event:all_work_complete
    *
*/

class DistriServer extends EventEmitter {
  /**
    * Fires when a single user submits work. Useful for authentication the user. Do not use for verifying work, use workgroup_complete instead. If a listener is attached to this event, a resolve() and reject() function will be emitted, and one of them must be called in order for Distri to know what to do with the work.
    * @event module:Distri-Node~DistriServer#work_submitted
    * @param {Any} work - Work the client was sent.
    * @param {Any} solution - Solution the client sent back.
    * @param {WebSocket} - WebSocket session of the user.
    * @param {Function} resolve - Function from a Promise. When called, the client's work is accepted and put into the solution pool.
    * @param {Function} reject - Function from a Promise. When called, the client's work is rejected.
    * @see DistriServer#workgroup_complete
  */
  /**
    * Fires when a piece of work has the required amount of solutions, set by the verification strength. If no listener is attached to this event, the first solution is automatically accepted.
      @event module:Distri-Node~DistriServer#workgroup_complete
      @param {Any} work - The work sent to all of the clients.
      @param {Array} solutions - An array of the solutions each client sent back. Note that this will still be an array even if the verification strength is only one.
      @param {Function} resolve - A function that accepts the solution given to it. Be sure to give it just one solution, and not the entire array.
      @param {Function} reject - A function that takes no parameters and rejects the entire workgroup, starting it over.
  */
  /**
    * Fires when a piece of work has a solution accepted for it.
    * @event module:Distri-Node~DistriServer#workgroup_accepted
    * @param {Any} work - The work sent to the clients.
    * @param {Any} solution - The accepted solution.
  */
  /**
    * Fires when a workgroup is rejected.
    * @event module:Distri-Node~DistriServer#workgroup_rejected
    * @param {Any} work - The work the clients were sent.
    * @param {Array} solutions - The solutions that were sent in for the problem.
  */
  /**
    * Fires when all work is complete. No parameters are given.
    * @event module:Distri-Node~DistriServer#all_work_complete
  */
  constructor (opts) {
    super()
    if (opts.constructor.name !== 'Object') throw new TypeError('Options must be given in the form of an object')

    const priorities = ['node', 'javascript']

    // explained in the README
    this.options = defaults(opts, {
      connection: {
        port: 8080
      },

      verificationStrength: 1,

      files: {

      }

    })

    const order = priorities.filter(priority => this.options.files[priority])

    /**
      * The WebSocket server for all of Distri's work
      * @member {Object}
    */
    this.server = new WebSocket.Server(this.options.connection)

    /**
      * The number of solutions that have been submitted for a single session. Resets when all work is finished.
      * @member {number}
    */
    this.solutions = 0

    /**
      * The number of currently connected clients.
      * @member {number}
    */
    this.userCount = 0

    /**
      * @typedef {Object} DistriProblem
      * @property {Any} work - The work for that problem.
      * @property {number} workers - The number of clients currently working on the problem.
      * @property {Array} solutions - The submitted solutions for the problem.
    */

    /**
      * An array of objects that contains all work, solutions, and other metadata.
      * @member {Array.<DistriProblem>}
    */
    this.session = []

    /**
      * An array of indexes that have not been solved yet.
      * @member {Array}
    */
    this.remaining = []

    /**
      * How many problems are undergoing verification.
      * @member {number}
    */
    this.pending = 0

    const randomIndGenerator = () => {
      let index

      if (this.session.length === 0 || this.pending + this.solutions > this.session.length) return -1
      // get a random index from the session array.
      index = this.remaining[(Math.random() * this.remaining.length) | 0]
      // if everything is full
      if (this.remaining.length === 0) {
        return -1
      } else {
        return index
      }
    }

    this.server.on('connection', (ws) => {
      // Generate a starting index in the session array. Starting at -1
      // will let the server know if someone unverified is trying to
      // request work
      let sentFile = false
      let ind = -1
      // generate something random for later on
      this.userCount++

      ws.on('message', (m) => {
        let message

        try {
          message = JSON.parse(m)
        } catch (e) {
          return
        }
        const workGetter = () => {
          ind = randomIndGenerator()
          if (ind === -1) {
            ws.send(JSON.stringify({error: 'No work available'}))
          } else {
            this.session[ind].workers++
            ws.send(JSON.stringify({responseType: 'submit_work', work: this.session[ind].work}))
            if (this.session[ind].workers + this.session[ind].solutions.length === this.options.verificationStrength && bs(this.remaining, ind) !== -1) {
              this.remaining.splice(bs(this.remaining, ind), 1)
            }
          }
        }

        // if anything is wrong with the message
        if ((message.constructor !== Object) || message.response === undefined || !message.responseType) {
          // kick the user if the server is using strict mode
          return
        }
        if (message.responseType === 'request') {
          if (sentFile === false) {
            let avail

            try {
              avail = message.response.reduce((pre, cur) => order.indexOf(cur) < order.indexOf(pre) ? cur : pre)
            } catch (e) {
              return
            }

            if (order.indexOf(avail) === -1) {
              ws.send(JSON.stringify({error: 'No work available for supported settings'}))
              ws.close()
              return
            }
            ws.send(JSON.stringify({responseType: 'file', response: [this.options.files[avail], avail]}))
          }
        } else if (message.responseType === 'request_work') {
          workGetter()
        } else if (message.responseType === 'submit_work') {
          if (message.response === undefined) {
            return
          }

          const index = ind

          ind = -1
          /*
            * Inform the user a client has submitted work. If there are no listeners for checking individual
            * submissions, automatically accept it.
           */
          new Promise((resolve, reject) => {
            if (this.listenerCount('work_submitted') === 0) {
              resolve()
            } else {
              this.emit('work_submitted', this.session[index].work, message.response, ws, resolve, reject)
            }
          })
          .then(() => {
            /* Add the work to the solutions array for that DistriProblem, and decrement the worker count. */
            this.session[index].solutions.push(message.response)

            this.session[index].workers--
            workGetter()
            if (this.session[index].solutions.length === this.options.verificationStrength) {
              this.pending++
              new Promise((resolve, reject) => {
                if (this.listenerCount('workgroup_complete') === 0) {
                  resolve()
                } else {
                  this.emit('workgroup_complete', this.session[index].work, this.session[index].solutions, resolve, reject)
                }
              })
                .then(answer => {
                  this.pending--
                  this.emit('workgroup_accepted', this.session[index].work, answer)
                  if (bs(this.remaining, index) !== -1) this.remaining.splice(bs(this.remaining, index), 1)
                  this.solutions++
                  if (this.solutions === this.session.length) {
                    this.session = []
                    this.emit('all_work_complete')
                    this.solutions = 0
                  }
                })
                .catch(() => {
                  this.pending--
                  this.emit('workgroup_rejected', this.session[index].work, this.session[index].solutions)
                  this.session[index].solutions = []
                  this.session[index].workers = 0
                  if (bs(this.remaining, index) === -1) {
                    bs.insert(this.remaining, index)
                  }
                })
            }
          })
          .catch(() => {
            // just ignore it, whatever
            this.workers--
          })
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

  /**
    * A function that adds work to the work queue.
    * @param {Array} work - Work to be added to the work queue.
    * @throws {TypeError} Work supplied is not an array.

  */
  addWork (work) {
    let emitReady = false
    if (this.session.length === 0) emitReady = true
    if (work.constructor.name !== 'Array') throw new TypeError('Added work must be in the form of an array')

    work.map(work => {
      this.remaining.push(this.session.push({work, solutions: [], workers: 0}) - 1)
    })
    this.remaining.sort((a, b) => {
      if (a > b) {
        return 1
      } else {
        return -1
      }
    })
    if (emitReady) this.server.clients.map(client => client.send(JSON.stringify({responseType: 'request'})))
  }

  /**
    A built-in verification function for Distri that checks to see if a set of solutions contains one solution that occurs more than a certain percentage of the time.
    @param {Array} solutions - The solutions that are being checked.
    @param {number} percentage - The percent of time a certain solution must occur equal to or more than.
    @param {Function} resolve - A callback function that will be called with the accepted answer. Good to use with the resolve() function in workgroup_complete.
    @param {Function} reject - A callback function that will be called if none of the solutions satisfy the percentage. Good to use with the reject() function in workgroup_complete.
    @see DistriServer#workgroup_complete
  */
  CheckPercentage (solutions, percentage, resolve, reject) {
    const init = solutions[0]
    if (solutions.every(solution => solution === init)) {
      resolve(init)
    } else {
      const check = new Map()
      solutions.map(solution => check.has(solution) ? check.set(solution, check.get(solution) + 1) : check.set(solution, 1))
      let greatest = {solution: null, hits: 0}
      for (let [key, val] of check) {
        if (val > greatest.hits) greatest = {solution: key, hits: val}
      }

      if ((greatest.hits / this.options.verificationStrength) >= (percentage / 100)) {
        resolve(greatest.solution)
      } else {
        reject()
      }
    }
  }
}

/**
  * A Node.js client for Distri.
  * @constructor
  * @throws {TypeError} Host is not a string.
  * @param {string} host - WebSocket link for the Distri server.
*/
class DistriClient {
  constructor (host) {
    const onDeath = require('death')

    if (typeof host !== 'string') throw new TypeError('Host link must be a string')
    const spawn = require('child_process').spawn
    const request = require('request')
    const fs = require('fs')

    /**
      * The WebSocket session for the client.
      * @member {WebSocket}
    */
    this.client = new WebSocket(host)
    const submit = (work) => {
      this.client.send(JSON.stringify({
        responseType: 'submit_work',
        response: work
      }))
    }

    const file = fs.createWriteStream(`./distri-file`)
    let runner

    onDeath((sig, err) => {
      if (runner) runner.kill('SIGINT')
      fs.unlinkSync(`./distri-file`)
    })

    this.client.on('open', () => {
      this.client.send(JSON.stringify({responseType: 'request', response: ['node']}))
    })
    this.client.on('message', (m) => {
      const message = JSON.parse(m)
      switch (message.responseType) {
        case 'file':
          request(message.response[0]).pipe(file).on('close', () => {
            runner = spawn(message.response[1], [`./distri-file`], {stdio: ['pipe', 'pipe', 'pipe']})
            runner.stdout.on('data', (data) => {
              if (data.toString() === 'ready') {
                this.client.send(JSON.stringify({response: true, responseType: 'request_work'}))
              } else {
                submit(JSON.parse(data).result)
              }
            })
          })
          break
        case 'submit_work':
          runner.stdin.write(JSON.stringify({data: { work: message.work }}))
          break
      }
    })
  }
}

module.exports = {
  DistriServer,
  DistriClient
}
