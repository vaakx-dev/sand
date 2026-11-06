import type { Conversation, Conversations, TurnInfo } from './contract'
import type { Leases } from './lifecycle/lease'
import type { Stores } from './store'

type Change = (info: TurnInfo) => void

export interface Announce<C extends Conversation> {
  turn(id: string): void
  pending(conversation: C): void
  watch(change: Change): () => void
}

export interface Owned<C extends Conversation> {
  conversations: Conversations<C>
  stores: Stores
  leases: Leases
  announce: Announce<C>
}

export const createAnnounce = <C extends Conversation>(conversations: Conversations<C>, stores: Stores): Announce<C> => {
  const watchers = new Set<Change>()
  return {
    turn(id) {
      const info = stores.turns.get(conversations.owner, id)
      if (!info) return
      conversations.changed?.(info)
      for (const change of watchers) change(info)
    },
    pending: conversation => conversations.queued?.(conversation),
    watch(change) {
      watchers.add(change)
      return () => void watchers.delete(change)
    },
  }
}
