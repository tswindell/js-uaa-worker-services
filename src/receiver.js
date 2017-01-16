/**
 *   The ServiceReceiver interface defines the methods required for handling
 * incoming requests from connections.
 */
class ServiceReceiver {
    /**
     *
     */
    get id () { throw new Error("Not Implemented") }

    /**
     *
     */
    process (handler, message) { throw new Error("Not Implemented") }
}

module.exports = ServiceReceiver

