import type { Attempt, BlockReason, Route } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { TicketRefused } from '../errors/ticket-refused'
import { headStart } from '../timing'
import { attemptResultOf } from './classify'
import type { DialContext, DialRun } from './context'
import { passedInOrder } from './in-order'
import { type Opened, openRoute } from './open'
import { type Probe, probeRoute } from './probe'

export interface Blocked {
  reason: BlockReason
  at?: number
  by?: string
}

export type DialOutcome = { ok: true; opened: Opened } | { ok: false; cause: string; blocked?: Blocked }

const blockedBy = (error: unknown): Blocked | undefined => {
  if (!(error instanceof TicketRefused)) return undefined
  const { reason, at, by } = error.refusal
  if (reason === 'removed') return { reason: 'removed', ...(at !== undefined && { at }), ...(by !== undefined && { by }) }
  if (reason === 'unknown') return { reason: 'not-paired' }
  return undefined
}

const allWrongPc = (probes: Probe[]) => probes.length > 0 && probes.every(probe => !probe.ok && probe.result === 'wrong-pc')

export const dial = async (routes: Route[], context: DialContext, run: DialRun, record: (attempt: Attempt) => void): Promise<DialOutcome> => {
  const expected = context.expected()
  let cause = 'no route answered'
  const probes = routes.map(route =>
    probeRoute(route, context.transportOf, expected).then(probe => {
      if (!probe.ok) {
        cause = probe.error
        record({ route, result: probe.result, at: Date.now(), ms: probe.ms, error: probe.error })
      }
      return probe
    }),
  )

  for await (const probe of passedInOrder(probes, headStart)) {
    if (run.stopped) return { ok: false, cause: 'stopped' }
    context.identified(probe.identity)
    const started = Date.now()
    try {
      const opened = await openRoute(probe, context)
      if (run.stopped) {
        opened.link.close()
        return { ok: false, cause: 'stopped' }
      }
      record({ route: probe.route, result: 'ok', at: Date.now(), ms: probe.ms })
      return { ok: true, opened }
    } catch (error) {
      cause = errorMessage(error)
      record({ route: probe.route, result: attemptResultOf(error), at: Date.now(), ms: Date.now() - started, error: cause })
      const blocked = blockedBy(error)
      if (blocked) return { ok: false, cause, blocked }
    }
  }

  const settled = await Promise.all(probes)
  return allWrongPc(settled) ? { ok: false, cause, blocked: { reason: 'wrong-pc' } } : { ok: false, cause }
}
