import type { Transport } from '@sand/devices-contract'
import { fetchVia } from './fetch'
import type { ViaRelay } from './relay'
import { openViaSocket } from './socket'

export type { ViaRelay } from './relay'

export const viaTransport = (relay: ViaRelay, pc: string): Transport => ({
  fetch: (path, init) => fetchVia(relay, pc, path, init),
  socket: (path, handlers, timeout) => openViaSocket(relay, pc, path, handlers, timeout),
})
