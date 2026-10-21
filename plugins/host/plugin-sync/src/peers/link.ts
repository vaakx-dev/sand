import { callPeer, remoteStore } from '@sand/host-remotes/peers'
import type { WireSocket } from '@sand/util/boot'
import type { PeerLink } from '../types'

export const createLink = (home: string): PeerLink & { stop(): void } => {
  const sockets = new Set<WireSocket>()
  return {
    list: async () => (await remoteStore(home)).list(),
    call: (record, request, input, timeout) => callPeer(record, request, input, sockets, timeout),
    stop: () => {
      for (const socket of sockets) socket.close()
      sockets.clear()
    },
  }
}
