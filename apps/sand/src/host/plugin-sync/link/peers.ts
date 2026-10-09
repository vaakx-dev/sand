import { remoteStore } from '../../remotes/store'
import type { PeerLink } from '../types'
import { callPeer } from './call'

export const createLink = (home: string): PeerLink & { stop(): void } => {
  const sockets = new Set<WebSocket>()
  return {
    list: async () => (await remoteStore(home)).list(),
    call: (record, request, timeout) => callPeer(record, request, sockets, timeout),
    stop: () => {
      for (const socket of sockets) socket.close()
      sockets.clear()
    },
  }
}
