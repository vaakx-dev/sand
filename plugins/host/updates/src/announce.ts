import { callPeer, remoteStore } from '@sand/host-remotes/peers'
import type { WireSocket } from '@sand/util/boot'
import { updatesHeard, type UpdateChannel } from './contract'

const timeout = 10_000

const announce = async (home: string, channel: UpdateChannel, build: string) => {
  const peers = (await remoteStore(home)).list()
  const sockets = new Set<WireSocket>()
  await Promise.all(peers.map(peer => callPeer(peer, updatesHeard, { channel, build }, sockets, timeout).catch(() => {})))
  for (const socket of sockets) socket.close()
}

export const announcer = (home: string) => (channel: UpdateChannel, build: string) => void announce(home, channel, build).catch(() => {})
