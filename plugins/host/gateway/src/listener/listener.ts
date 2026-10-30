import { errorMessage, serial } from '@sand/util'
import type { Server } from 'bun'
import type { ListenScope } from '../contract'
import type { Listen, SocketData } from '../listen'
import { loopbackAddress, networkAddresses, urlFor } from './addresses'

const dualStack = '::'
const hostnames: Record<ListenScope, string[]> = { local: [loopbackAddress], network: [dualStack, '0.0.0.0'] }

interface Bound {
  scope: ListenScope
  hostname: string
  server: Server<SocketData>
}

export const createListener = (listen: Listen, requestedPort: number) => {
  const open = (scope: ListenScope, port: number): Bound => {
    const failures: string[] = []
    for (const hostname of hostnames[scope]) {
      try {
        return { scope, hostname, server: listen(hostname, port) }
      } catch (error) {
        failures.push(`${hostname}:${port}: ${errorMessage(error)}`)
      }
    }
    throw new Error(`sand could not listen on ${failures.join('; ')}`)
  }

  let bound = open('local', requestedPort)
  const port = bound.server.port ?? requestedPort
  const switching = serial()

  const rebind = async (next: ListenScope) => {
    if (next === bound.scope) return false
    const previous = bound.scope
    await bound.server.stop(true)
    try {
      bound = open(next, port)
      return true
    } catch (error) {
      bound = open(previous, port)
      throw error
    }
  }

  const addresses = () => (bound.scope === 'network' ? [loopbackAddress, ...networkAddresses(bound.hostname === dualStack)] : [loopbackAddress])

  return {
    port: () => port,
    scope: () => bound.scope,
    bind: (next: ListenScope) => switching(() => rebind(next)),
    addresses,
    urls: () => addresses().map(address => urlFor(address, port)),
    stop: () => bound.server.stop(true),
  }
}

export type Listener = ReturnType<typeof createListener>
