import type { HostHealth } from '@sand/host-health/contract'
import { callPeer, parseHealth, PeerError, remoteStore } from '@sand/kit/host'

const timeout = 20_000

export const createPeerHealth = (home: string) => {
  const sockets = new Set<WebSocket>()
  return {
    async health(device: string): Promise<HostHealth> {
      const record = (await remoteStore(home)).get(device)
      if (!record) throw new Error('that PC is not paired with this one')
      let answer: unknown
      try {
        answer = await callPeer(record, { type: 'host.health' }, sockets, timeout)
      } catch (error) {
        if (error instanceof PeerError && error.state === 'failed') throw new Error(`${record.name} could not report its health: ${error.message}`)
        throw error
      }
      const health = parseHealth(answer)
      if (!health) throw new Error(`${record.name} sent a health report this sand can't read`)
      return health
    },
    stop() {
      for (const socket of sockets) socket.close()
      sockets.clear()
    },
  }
}
