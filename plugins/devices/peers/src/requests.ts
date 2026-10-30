import { connectionPing, type PublishedRoute, peersAnnounce, peersList } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { PeerSet } from './peer-set'

interface RequestParts {
  set: PeerSet
  announced(pc: string, routes: PublishedRoute[]): void
}

export const peerRequests = (hub: Hub, { set, announced }: RequestParts): (() => Dispose)[] => [
  () => hub.handle(peersList, () => set.peers.list()),
  () => hub.handle(connectionPing, () => ({ at: Date.now() })),
  () => hub.handle(peersAnnounce, ({ routes }, caller) => announced(caller.device, routes)),
]
