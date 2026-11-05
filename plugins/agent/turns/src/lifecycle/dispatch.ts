import type { Session } from '@sand/chats/contract'
import { runtimeDrain } from '@sand/host-runtimes/contract'
import type { Announce } from '../announce'
import type { TurnsContext } from '../context'
import type { Stores } from '../store'
import type { Drive } from './run'
import type { Opener } from './start'

const sweepEvery = 2_000

export interface DispatchDeps {
  stores: Stores
  opener: Opener
  drive: Drive
  announce: Announce
}

export const createDispatch = (ctx: TurnsContext, { stores, opener, drive, announce }: DispatchDeps) => {
  let stopped = ctx.cli.place !== 'runtime'

  const hold = (session: Session, item: string) => {
    stores.pending.hold(session.id, item, true)
    announce.pending(session)
  }

  const dispatch = async (session: Session) => {
    if (stopped || stores.turns.current(session.id)) return
    const next = stores.pending.next(session.id)
    if (!next) return
    const opening = await opener.prepare(session, next.prompt, next.origin).catch(() => undefined)
    if (!opening) return hold(session, next.id)
    const started = ctx.ledger.tx(() => (stores.turns.current(session.id) || !stores.pending.remove(session.id, next.id) ? undefined : opener.open(opening)))
    if (!started) return
    announce.pending(session)
    drive(started).catch(error => ctx.report(error))
  }

  const sweep = () => {
    for (const id of stores.pending.waiting()) {
      const session = ctx.sessions.open(id)
      if (session) dispatch(session).catch(error => ctx.report(error))
    }
  }

  if (!stopped) {
    ctx.on(runtimeDrain, () => {
      stopped = true
    })
    ctx.effect(() => {
      const timer = setInterval(sweep, sweepEvery)
      return () => clearInterval(timer)
    })
  }

  return dispatch
}
