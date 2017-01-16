/**
 * ServiceFactory is the interface that an Acceptor or Connector expects in
 * order to start performing and servicing requests.
 */
class ServiceFactory {
    /**
     * @param {MessagePort} port
     */
    create (port) { throw new Error("Not implemented") }
}

module.exports = ServiceFactory

