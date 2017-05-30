const EventEmitter = require('events').EventEmitter
const WebSocket = require('ws')
const bs = require('binary-search')
const msgpack = require('msgpack-lite')
const comparator = (a, b) => a - b

class DistriServer extends EventEmitter {
  constructor (opts = {}) {
    super()

    this.options = {}
    Object.assign(this.options, {

      // Options passed to the constructor for the WebSocket Server.
      connection: { port: 8080 },

      // The amount of solutions required before a problem is considered complete.
      verificationStrength: 1,

      // The contents of the worker file sent to the user.
      file: ''
    }, opts)

    // Where all the work goes, along with the solutions.
    this.session = []

    /*
      An array of available indexes in session, where the worker count plus
      the solution count is less then the number defined by verificationStrength
      in the options.
    */
    this.available = []

    // The number of problems solved.
    this.solved = 0
  }

  getIndex () {
    // If nothing is available, return -1.
    if (this.available.length === 0) return -1

    // If work is available, randomly choose a piece of work.
    return Math.floor(Math.random() * this.available.length)
  }

  serveUser (ws) {
    ws.ind = this.getIndex()
    const ind = ws.ind
    /*
      There is no work, so wait until addWork is called and this function
      will be called again.
      Setting the ind to -1 will tell addWork that the user is awaiting work.
    */
    if (ind === -1) return

    // There is work, so give it to the user.
    this.session[ind].workers++
    ws.send(msgpack.encode({ type: 1, work: this.session[ind].work }))

    // If the problem has reached the verificationStrength limit, remove it from the available array.
    if (this.session[ind].workers + this.session[ind].solutions.length === this.options.verificationStrength) {
      this.available.splice(bs(this.available, ind, comparator), 1)
    }
  }

  addWork (work = []) {
    if (!Array.isArray(work)) throw new TypeError('Work supplied to addWork must be in the form of an array')
    work.map(item => this.session.push({ workers: 0, solutions: [], work: item }))

    this.server.clients
  }

  handleFailure (ind) {
    this.session[ind].workers--
    const availableIndex = bs(this.available, ind, comparator)
    if (availableIndex < 0) {
      this.available.splice(Math.abs(availableIndex + 1), ind)
    }
    return true
  }

  handleSubmission (encodedWork, ws) {
    let work
    const ind = ws.ind
    ws.ind = -1
    this.serveUser(ws)
    try {
      work = msgpack.decode(encodedWork).work
    } catch (e) {
      this.handleFailure(ind)
      return
    }
    new Promise((resolve, reject) => {
      if (this.listenerCount('work_complete') === 0) resolve()
      this.emit('work_complete', this.session[ind].work, work, resolve, reject, ws)
    })
    .then(() => {
      this.session[ind].solutions.push(work)
      this.session[ind].workers--

      if (this.session[ind].solutions.length === this.options.verificationStrength) {
        new Promise((resolve, reject) => {
          this.emit('workgroup_complete', this.session[ind].work, this.session[ind].solutions, resolve, reject)
        })
        .then(() => {
          if (++this.solved === this.session.length) this.emit('all_work_complete')
        })
        .catch(() => {
          this.available.splice(bs(this.available, ind, comparator), ind, 0)
        })
      }
    })
    .catch(() => this.handleFailure(ind))
  }

  start () {
    // Start the server.
    return new Promise((resolve, reject) => {
      this.server = new WebSocket.Server(this.options.connection, resolve)

      this.server.on('connection', ws => {
        // Right when a user connects, send them the file.
        ws.send(msgpack.encode({ type: 0, file: this.options.file }))

        ws.ind = -1

        ws.on('message', m => this.handleSubmission(m, ws))

        ws.on('close', () => {
          if (ws.ind !== -1) this.handleFailure(ws.ind)
        })
      })
    })
  }

}

module.exports = DistriServer
