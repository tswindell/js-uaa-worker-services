const EventEmitter = require('events')

/**
 * The Acceptor class sits on a window or Worker local port waiting for incoming
 * connections to announce themselves. When an incomming Connector connects to
 * an Acceptor successfully, a ServiceFactory is called on the new connection
 * to begin servicing the clients requests.
 */
class Acceptor {
    /**
     * @param {ServiceFactory} factory
     */
    constructor (factory) {
        this._events  = new EventEmitter()
        this._factory = factory
        this._running = false
    }

    /**
     * @param {Port} port
     */
    listen (port) {
        if (this._running) return
        port.addEventListener('message', this._accept.bind(this))

        this._port = port
        this._running = true
    }

    /**
     *
     */
    shutdown () {
        if (!this._running) return

        this._port.removeEventListener('message', this._accept.bind(this))

        this._running = false
        this._port = null
    }


    _accept (event) {
        if (event.data !== 'CONNECT') return

        if (event.ports.length === 0) {
            console.log("WARN: No port supplied in CONNECT message.")
            return
        }

        console.log("INFO: Accepting connection and creating service handler.")
        event.ports[0].postMessage('ACCEPTED')
        const connection = this._factory.create(event.ports[0])
        this._events.emit('accepted', connection)
    }

    // EventEmitter
    on (event, listener) { this._events.on(event, listener) }
    removeListener (event, listener) { this._events.removeListener(event, listener) }
}

module.exports = Acceptor

