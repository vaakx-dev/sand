import type { Conversation, Conversations, Runner } from './contract'
import type { EngineContext } from './context'
import { createDispatch } from './lifecycle/dispatch'
import type { Leases } from './lifecycle/lease'
import { createRecovery } from './lifecycle/recover'
import { createDriver } from './lifecycle/run'
import { createSend } from './lifecycle/send'
import { createOpener } from './lifecycle/start'
import { createFollow, createWait } from './lifecycle/wait'
import { createAnnounce, type Owned } from './owned'
import type { Stores } from './store'

export interface Shared {
  stores: Stores
  leases: Leases
  running(): boolean
}

export interface Attached<C extends Conversation> {
  runner: Runner<C>
  sweep(): void
  recover(): void
}

export const attachConversations = <C extends Conversation>(
  ctx: EngineContext,
  { stores, leases, running }: Shared,
  conversations: Conversations<C>,
  detach: () => void,
): Attached<C> => {
  const { owner } = conversations
  const owned: Owned<C> = { conversations, stores, leases, announce: createAnnounce(conversations, stores) }
  const { announce } = owned
  const opener = createOpener(ctx, owned)
  const drive = createDriver(ctx, owned, conversation => dispatch(conversation).catch(error => ctx.report(error)))
  const dispatch = createDispatch(ctx, owned, { opener, drive, running })
  const recover = createRecovery(ctx, owned, { drive, running })

  const runner: Runner<C> = {
    send: createSend(ctx, owned, { opener, drive, dispatch, recover }),
    async run(conversation, prompt, { origin = 'user', signal } = {}) {
      const opening = await opener.prepare(conversation, prompt, origin)
      const started = ctx.ledger.tx(() => {
        if (stores.turns.current(conversation)) throw new Error('A turn is already running in this conversation')
        return opener.open(opening)
      })
      const { result, failure } = await drive.run(started, signal)
      if (failure) throw failure.error
      return result
    },
    interrupt(conversation, turn) {
      const current = stores.turns.current(conversation)
      if (!current || (turn && turn !== current.id)) return false
      leases.interrupt(current.id)
      return true
    },
    current: conversation => stores.turns.current(conversation),
    get: id => stores.turns.get(owner, id),
    list: (conversation, before, limit) => stores.turns.list(conversation, before, limit),
    live: () => stores.turns.live(owner),
    wait: createWait(owned),
    follow: createFollow(owned),
    pending: conversation => stores.pending.list(conversation),
    withdraw(conversation, pending) {
      if (!stores.pending.remove(conversation, pending)) return false
      announce.pending(conversation)
      return true
    },
    hold(conversation, pending, held) {
      if (!stores.pending.hold(conversation, pending, held)) return false
      announce.pending(conversation)
      if (!held) dispatch(conversation).catch(error => ctx.report(error))
      return true
    },
    forget(id) {
      const conversation = { owner, id }
      stores.turns.remove(conversation)
      stores.pending.clear(conversation)
      stores.receipts.clear(conversation)
    },
    detach,
  }

  const sweep = () => {
    recover()
    for (const id of stores.pending.waiting(owner)) {
      const conversation = conversations.open(id)
      if (conversation) dispatch(conversation).catch(error => ctx.report(error))
    }
  }

  return { runner, sweep, recover }
}
