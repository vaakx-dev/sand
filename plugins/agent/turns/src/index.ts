import { sessionBusy, sessionRemove, type Session } from '@sand/chats/contract'
import { turns, type Turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { createAnnounce } from './announce'
import { serveLoop } from './compat'
import { inject } from './context'
import { createDispatch } from './lifecycle/dispatch'
import { createLeases } from './lifecycle/lease'
import { recoverTurns } from './lifecycle/recover'
import { createDriver } from './lifecycle/run'
import { createSend } from './lifecycle/send'
import { createOpener } from './lifecycle/start'
import { createWait } from './lifecycle/wait'
import { serveTurns } from './serve'
import { openStores } from './store'

const pruneEvery = 60 * 60 * 1000

export default definePlugin({
  name: 'turns',
  description: 'Runs each turn of a chat: the model replies, the tools it calls run, and it repeats until it is done',
  inject,
  apply(ctx) {
    const stores = openStores(ctx.ledger)
    const leases = createLeases(ctx, stores.turns)
    const announce = createAnnounce(ctx, stores.turns)
    const opener = createOpener(ctx, stores.turns, leases)
    const drive = createDriver(ctx, stores, leases, announce, session => dispatch(session).catch(error => ctx.report(error)))
    const dispatch = createDispatch(ctx, { stores, opener, drive, announce })

    const hold = (session: Session, pending: string, held: boolean) => {
      if (!stores.pending.hold(session.id, pending, held)) return false
      announce.pending(session)
      if (!held) dispatch(session).catch(error => ctx.report(error))
      return true
    }

    const service: Turns = {
      send: createSend(ctx, { stores, opener, drive, dispatch, announce }),
      async run(session, prompt, { origin = 'user', signal } = {}) {
        const opening = await opener.prepare(session, prompt, origin)
        const started = ctx.ledger.tx(() => {
          if (stores.turns.current(session.id)) throw new Error('A turn is already running in this chat')
          return opener.open(opening)
        })
        const { result, failure } = await drive(started, signal)
        if (failure) throw failure.error
        return result
      },
      interrupt(session, turn) {
        const current = stores.turns.current(session.id)
        if (!current || (turn && turn !== current.id)) return false
        leases.interrupt(current.id)
        return true
      },
      current: session => stores.turns.current(session.id),
      get: id => stores.turns.get(id),
      wait: createWait(ctx, stores.turns),
      pending: session => stores.pending.list(session.id),
      withdraw(session, pending) {
        if (!stores.pending.remove(session.id, pending)) return false
        announce.pending(session)
        return true
      },
    }

    ctx.provide(turns, service)
    serveTurns(ctx, { service, store: stores.turns, hold })
    serveLoop(ctx, service)
    ctx.on(sessionBusy, session => Boolean(stores.turns.current(session.id)))
    ctx.on(sessionRemove, id => {
      stores.turns.remove(id)
      stores.pending.clear(id)
      stores.receipts.clear(id)
    })
    recoverTurns(ctx, stores, leases.owner, announce)
    ctx.effect(() => {
      stores.receipts.prune()
      const timer = setInterval(stores.receipts.prune, pruneEvery)
      return () => clearInterval(timer)
    })
  },
})
