import type { RouteStore, Signer } from '@sand/devices-contract'
import { createEvents } from './links/events'
import { createPeerLinks } from './links/links'
import { createListeners } from './links/listeners'
import { createPeers } from './service'

export const createPeerSet = (signer: Signer, store: RouteStore) => {
  const events = createEvents()
  const opens = createListeners<[pc: string]>()
  const changes = createListeners<[]>()
  let pending = false

  const changed = () => {
    if (pending) return
    pending = true
    queueMicrotask(() => {
      pending = false
      changes.emit()
    })
  }

  const links = createPeerLinks({ signer, store, events, opened: pc => opens.emit(pc), changed })
  return { links, peers: createPeers({ links, events, opens, changes }) }
}

export type PeerSet = ReturnType<typeof createPeerSet>
