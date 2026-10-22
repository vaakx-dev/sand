import { sessions, type Session } from '@sand/chats/contract'
import { contextBuild, loop, turnEnd, turnStart } from '@sand/loop/contract'
import { context } from '@sand/prompt/contract'
import type { CompactionContext, Compactor } from './compact'
import type { Tracker } from './measure/tracker'

const cacheExpiry = 55 * 60_000
const worthCompacting = 50_000

export const idleCompact = (ctx: CompactionContext, compactor: Compactor, tracker: Tracker) => {
  const timers = new Map<string, Timer>()

  const cancel = (session: Session) => {
    clearTimeout(timers.get(session.id))
    timers.delete(session.id)
  }

  const requestOf = async (session: Session) => {
    const builder = ctx.get(context)
    return builder && ctx.waterfall(contextBuild, await builder.build(session), session)
  }

  const compact = async (id: string) => {
    timers.delete(id)
    const session = ctx.get(sessions)?.open(id)
    if (!session || session.settled || ctx.get(loop)?.active(session)) return
    const request = await requestOf(session)
    if (!request || tracker.project(id, request) < worthCompacting) return
    const release = ctx.busy()
    await compactor
      .compact(session, request, { reason: 'idle' })
      .catch(error => ctx.report(error))
      .finally(release)
  }

  ctx.on(turnStart, cancel)
  ctx.on(turnEnd, session => {
    cancel(session)
    if (session.kind === 'thread') timers.set(session.id, setTimeout(() => void compact(session.id), cacheExpiry))
  })
  ctx.effect(() => () => timers.forEach(clearTimeout))
}
