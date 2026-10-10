import type { Context } from 'drydock'
import type { Capture } from '../capture'
import { createTurnStats } from './stats'
import { watchSubagents } from './subagents'
import { watchWorkflows } from './workflows'

export const watchTurns = (ctx: Context, capture: Capture) => {
  const stats = createTurnStats(ctx)
  const workflows = watchWorkflows(ctx, capture)
  const subagents = watchSubagents(ctx, capture, workflows)

  ctx.on('turn.start', session => {
    const settings = stats.start(session)
    if (session.kind === 'agent') return
    if (session.messages().length === 1) capture('thread.started')
    capture('message.sent', settings)
  })

  ctx.on('session.entry', stats.entry)

  ctx.on('turn.end', (session, result) => {
    const properties = stats.finish(session, result)
    if (!properties) return
    if (session.kind === 'agent') subagents.finished(session, properties)
    else capture('turn.finished', properties)
  })
}
