/**
  @module Distri-Node
*/

const WebSocket = require('ws')
const EventEmitter = require('events').EventEmitter
const bs = require('binary-search')

const workGetter = socket => {
  const ind = randomIndGenerator()
  if (ind === -1) {
    socket.send(JSON.stringify({error: 'No work available'}))
  } else {
    this.session[ind].workers++
    socket.send(JSON.stringify({responseType: 'submit_work', work: this.session[ind].work}))
    if (this.session[ind].workers + this.session[ind].solutions.length === this.options.verificationStrength && bs(this.remaining, ind, comparator) >= 0) {
      this.remaining.splice(bs(this.remaining, ind, comparator), 1)
    }
  }
}

const randomIndGenerator = () => {
  // if nothing is available, return -1
  if (this.remaining.length === 0 || this.pending + this.solutions > this.session.length) return -1

  // get a random index from the session array. '| 0' floors it in a much faster way.
  return this.remaining[(Math.random() * this.remaining.length) | 0]
}

const comparator = (a, b) => a - b

/**
    * Constructor for DistriServer.
    * @constructor
    * @throws {TypeError} Options sent to the constructor are not in a single object.
    * @extends EventEmitter
    *
    * @param {Object} opts - The object passed to the constructor.
    * @param {Object} opts.connection - Options for a ws.Server constructor. (websockets/ws)
    * @param {number} opts.verificationStrength - How many solutions must be submitted for a problem to be considered complete. Security measure to help keep clients from spamming incorrect answers.
    * @param {Object} opts.file - URL for Distri clients to fetch, contains worker script.
    *
    * @emits DistriServer#event:work_submitted
    * @emits DistriServer#event:workgroup_complete
    * @emits DistriServer#event:all_work_complete
    *
*/

class DistriServer extends EventEmitter {
  /**
    * Fires when a single user submits work. Useful for authentication the user. Do not use for verifying work, use workgroup_complete instead. If a listener is attached to this event, a resolve() and reject() function will be emitted, and one of them must be called in order for Distri to know what to do with the work.
    * @event module:Distri-Node~DistriServer#work_submitted
    * @param {Any} work - Work the client was sent.
    * @param {Any} solution - Solution the client sent back.
    * @param {Function} resolve - Function from a Promise. When called, the client's work is accepted and put into the solution pool.
    * @param {Function} reject - Function from a Promise. When called, the client's work is rejected.
    * @param {WebSocket} - WebSocket session of the user.
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
    * Fires when all work is complete. No parameters are given.
    * @event module:Distri-Node~DistriServer#all_work_complete
  */
  constructor (opts) {
    super()
    if (opts.constructor.name !== 'Object') throw new TypeError('Options must be given in the form of an object')

    // explained in the README
    this.options = {}
    Object.assign(this.options, {
      connection: {
        port: 8080
      },
      verificationStrength: 1,
      file: ''

    }, opts)

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

    this.server.on('connection', ws => {
      // Generate a starting index in the session array. Starting at -1
      // will let the server know if someone unverified is trying to
      // request work
      let sentFile = false
      let ind = -1
      // generate something random for later on
      this.userCount++

      ws.on('message', m => {
        let message

        try {
          message = JSON.parse(m)
        } catch (e) {
          return
        }

        // if anything is wrong with the message
        if ((message.constructor !== Object) || message.response === undefined || !message.responseType) {
          return
        }
        if (message.responseType === 'request') {
          if (sentFile === false) {
            ws.send(JSON.stringify({responseType: 'file', response: this.options.file}))
          }
        } else if (message.responseType === 'request_work') {
          workGetter(ws)
        } else if (message.responseType === 'submit_work') {

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
              this.emit('work_submitted', this.session[index].work, message.response, resolve, reject, ws)
            }
          })
          .then(() => {
            /* Add the work to the solutions array for that DistriProblem, and decrement the worker count. */
            this.session[index].solutions.push(message.response)

            this.session[index].workers--
            workGetter(ws)
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
                  const remainingIndex = bs(this.remaining, index, comparator)
                  if (remainingIndex > 0) this.remaining.splice(remainingIndex)
                  this.solutions++
                  if (this.solutions === this.session.length) {
                    this.session = []
                    this.emit('all_work_complete')
                    this.solutions = 0
                  }
                })
                .catch(() => {
                  this.pending--
                  this.session[index].solutions = []
                  this.session[index].workers = 0
                  if (bs(this.remaining, index, comparator) < 0) {
                    this.remaining.push(index)
                    this.remaining.sort(comparator)
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
    this.remaining.sort(comparator)
    if (emitReady) this.server.clients.map(workGetter)
  }
}

module.exports = DistriServer
