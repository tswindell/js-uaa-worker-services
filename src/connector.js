const EventEmitter = require('events')

/**
 * The Connector class attempts to connect to a remote Acceptor instance and
 * initiate a connection via a dedicated MessageChannel. When a successful
 * connection is established, a ServiceHandler is created using the provided
 * factory.
 */
class Connector {
    /**
     * @param {ServiceFactory} factory
     */
    constructor (factory) {
        this._events = new EventEmitter()

        this._factory = factory
        this._connected = false
    }

    /**
     * @param {Port} port
     * @param {int} timeout (optional)
     */
    connect (remote, timeout) {
        if (!timeout) timeout = 5000

        return new Promise((fulfill, reject) => {
            this._ch = new MessageChannel()
            this._ch.port1.onmessage = this._onMessage.bind(this)

            // Varying calls if we're connecting via a Window or a Worker port.
            if (remote instanceof MessagePort) {
                remote.postMessage('CONNECT', [this._ch.port2])
            } else {
                remote.postMessage('CONNECT', '*', [this._ch.port2])
            }

            this._onSuccess = fulfill
            this._onFailure = reject

            this._timeout = setTimeout(this._onTimeout.bind(this), timeout)
        })
    }


    _onMessage (event) {
        if (event.data !== 'ACCEPTED') {
            return this._onFailure(new Error("Invalid response from service"))
        }

        clearInterval(this._timeout)

        this._ch.port1.onmessage = undefined
        this._onSuccess(this._factory.create(this._ch.port1))
    }

    _onTimeout () {
        this._onFailure(new Error("Connection timed out."))
    }
}

module.exports = Connector

