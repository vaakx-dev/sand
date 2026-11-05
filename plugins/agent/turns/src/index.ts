import { sessionBusy, sessionRemove } from '@sand/chats/contract'
import { loop } from '@sand/loop/contract'
import { turns, type Turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { loopOf } from './compat'
import { inject } from './context'
import { createLeases } from './lifecycle/lease'
import { recoverTurns } from './lifecycle/recover'
import { turnRunner } from './lifecycle/run'
import { createTurnStore } from './store/turns'

export default definePlugin({
  name: 'turns',
  description: 'Runs each turn of a chat: the model replies, the tools it calls run, and it repeats until it is done',
  inject,
  apply(ctx) {
    const store = createTurnStore(ctx.ledger)
    const leases = createLeases(ctx, store)
    const service: Turns = {
      run: turnRunner(ctx, store, leases),
      interrupt(session) {
        const turn = store.current(session.id)
        if (turn) leases.interrupt(turn.id)
        return Boolean(turn)
      },
      current: session => store.current(session.id),
      get: id => store.get(id),
    }
    ctx.provide(turns, service)
    ctx.provide(loop, loopOf(service))
    ctx.on(sessionBusy, session => Boolean(store.current(session.id)))
    ctx.on(sessionRemove, store.remove)
    recoverTurns(ctx, store, leases.owner)
  },
})
