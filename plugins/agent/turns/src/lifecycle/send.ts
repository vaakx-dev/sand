import { promptLabel, type Session } from '@sand/chats/contract'
import type { SendInput, SendResult, TurnInfo } from '@sand/turns-contract/contract'
import type { Announce } from '../announce'
import type { TurnsContext } from '../context'
import type { Stores } from '../store'
import type { Drive } from './run'
import type { Opener, Opening, Started } from './start'

type Routed = { result: SendResult } & ({ kind: 'repeat' } | { kind: 'started'; started: Started } | { kind: 'pending'; running?: TurnInfo })

export interface SendDeps {
  stores: Stores
  opener: Opener
  drive: Drive
  dispatch(session: Session): Promise<void>
  announce: Announce
}

export const createSend = (ctx: TurnsContext, { stores, opener, drive, dispatch, announce }: SendDeps) => {
  const route = (session: Session, input: SendInput, opening: Opening | undefined): Routed => {
    const running = stores.turns.current(session.id)
    if (!running && opening) {
      const started = opener.open(opening)
      return { kind: 'started', started, result: { disposition: 'started', turn: started.info.id } }
    }
    const kind = running && input.mode !== 'queue' ? 'steer' : 'queue'
    const label = input.label ?? promptLabel(input.prompt)
    const item = stores.pending.add({ session: session.id, kind, prompt: input.prompt, label, origin: input.origin ?? 'user' })
    const disposition = kind === 'steer' ? 'steered' : 'queued'
    return { kind: 'pending', running, result: { disposition, pending: item.id, ...(running && { turn: running.id }) } }
  }

  const store = (session: Session, input: SendInput, opening: Opening | undefined) =>
    ctx.ledger.tx((): Routed => {
      const earlier = stores.receipts.get(session.id, input.clientRequestId)
      if (earlier) return { kind: 'repeat', result: earlier }
      const routed = route(session, input, opening)
      stores.receipts.put(session.id, input.clientRequestId, routed.result)
      return routed
    })

  return async (session: Session, input: SendInput): Promise<SendResult> => {
    const earlier = stores.receipts.get(session.id, input.clientRequestId)
    if (earlier) return earlier
    if (input.settings) ctx.modelSettings.update(session, input.settings)
    const opening = stores.turns.current(session.id) ? undefined : await opener.prepare(session, input.prompt, input.origin ?? 'user')
    const routed = store(session, input, opening)
    if (routed.kind === 'started') drive(routed.started).catch(error => ctx.report(error))
    if (routed.kind === 'pending') {
      announce.pending(session)
      if (!routed.running) dispatch(session).catch(error => ctx.report(error))
    }
    return routed.result
  }
}
