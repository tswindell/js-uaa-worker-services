const Uuid         = require('uuid')
const Promise      = require('promise')
const EventEmitter = require('events')

//FIXME: Implement port id endpoints in messages and filter appropriately.

/**
 *
 */
class ServiceHandler {
    /**
     *
     */
    constructor (port, addr) {
        this._events = new EventEmitter()

        if (!addr) addr = Uuid()

        this._localAddr = addr

        this._port = port
        this._receivers = []
        this._pending = {}
        this._nonce = 0

        // Varying calls if we're connecting via a Window or a Worker port.
        if (port instanceof MessagePort) {
            port.onmessage = event => {
                this._onIncomingMessage.bind(this)(event.data)
            }
        } else {
            port.addEventListener('message', event => {
                this._onIncomingMessage.bind(this)(event.data)
            })
        }
    }

    /**
     *
     */
    attachReceiver (receiver) {
        this._receivers.push(receiver)
    }

    /**
     *
     */
    detachReceiver (receiver) {
        this._receivers.splice(this._receivers.indexOf(receiver) - 1, 1)
    }

    /**
     *
     */
    send (pkt) {
        if (!pkt.from) pkt.from = this._localAddr

        pkt.setResponse = undefined

        console.log("DEBUG: Sending message: " + JSON.stringify(pkt))
        this._port.postMessage(pkt)
    }

    /**
     *
     */
    sendTo (addr, pkt) {
        pkt.to = addr
        this.send(pkt)
    }

    /**
     *
     */
    event (evt) {
        this.send({notify: evt})
    }

    /**
     *
     */
    message (msg) {
        this.send({message: msg})
    }

    /**
     *
     */
    request (req, timeout) {
        if (!timeout) timeout = 5000

        return new Promise((fulfill, reject) => {
            // Attach nonce for reacting to response.
            const nonce = this._nonce
            this._nonce += 1

            this.send({request: req, nonce: nonce})

            this._pending[nonce] = {
                onSuccess: fulfill,
                onFailure: reject,

                timeout: setTimeout(_ => {
                        delete this._pending[nonce]
                        reject(new Error("Request timed out."))
                    }, timeout)
                }
        })
    }

    /**
     *
     */
    requestTo (dst, req, timeout) {
        if (!timeout) timeout = 5000

        return new Promise((fulfill, reject) => {
            // Attach nonce for reacting to response.
            const nonce = this._nonce
            this._nonce += 1

            this.sendTo(dst, {request: req, nonce: nonce})

            this._pending[nonce] = {
                onSuccess: fulfill,
                onFailure: reject,

                timeout: setTimeout(_ => {
                        delete this._pending[nonce]
                        reject(new Error("Request timed out."))
                    }, timeout)
                }
        })
    }

    /**
     *
     */
    _onIncomingMessage (mesg) {
        if (typeof mesg !== 'object') {
            console.log("WARN: Malformed message received: " + mesg)
            return
        }

        if (!this._remoteAddr && 'from' in mesg) {
            this._remoteAddr = mesg.from
        }

        // If we've received a request, then add response generator.
        if ('request' in mesg) {
            mesg.setResponse = ((res) => {
                this.sendTo(mesg.from, {response: res, nonce: mesg.nonce})
            }).bind(this)
        }

        // Cycle installed receivers to process and filter messages.
        for (let i = 0; i < this._receivers.length; i++) {
            const receiver = this._receivers[i]
            if (receiver.process(this, mesg)) {
                return
            }
        }

        // Find and invoke handler if mesg is response to request.
        if ('response' in mesg && mesg.nonce in this._pending) {
            const callbacks = this._pending[mesg.nonce]
            clearInterval(callbacks.timeout)            
            delete this._pending[mesg.nonce]
            if (mesg.error) return callbacks.onFailure(mesg.response)
            return callbacks.onSuccess(mesg.response)
        }
    }

    // EventEmitter
    on (event, listener) { return this._events.on(event, listener) }
    removeListener (event, listener) { return this._events.removeListener(event, listener) }
}

module.exports = ServiceHandler

