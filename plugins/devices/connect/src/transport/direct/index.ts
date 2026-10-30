import type { Transport } from '@sand/devices-contract'
import { fetchDirect } from './fetch'
import { openDirectSocket } from './socket'

export const directTransport = (url: string): Transport => ({
  fetch: (path, init) => fetchDirect(url, path, init),
  socket: (path, handlers, timeout) => openDirectSocket(url, path, handlers, timeout),
})
