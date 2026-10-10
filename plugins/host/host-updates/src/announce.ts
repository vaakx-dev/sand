import { callPeer, remoteStore } from '@sand/kit/host'
import type { UpdateChannel } from './contract'

const timeout = 10_000

export const announcer = (home: string) => (channel: UpdateChannel, build: string) =>
  void (async () => {
    const peers = (await remoteStore(home)).list()
    const sockets = new Set<WebSocket>()
    await Promise.all(peers.map(peer => callPeer(peer, { type: 'updates.heard', channel, build }, sockets, timeout).catch(() => {})))
    for (const socket of sockets) socket.close()
  })().catch(() => {})
