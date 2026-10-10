import type { UsageRecord } from '@sand/loops/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import type { Capture } from '../capture'

interface Running {
  at: number
  settings: Record<string, unknown>
  usage?: UsageRecord
}

export const watchTurns = (ctx: Context, capture: Capture) => {
  const running = new Map<string, Running>()

  const settingsOf = (session: Session) => {
    const effective = ctx.modelSettings?.effective(session)
    const model = effective?.model
    return { model, provider: ctx.llm?.provider?.(model)?.id, effort: effective?.effort, loop: ctx.loops?.state(session).name }
  }

  ctx.on('turn.start', session => {
    if (session.kind === 'agent') return
    const settings = settingsOf(session)
    running.set(session.id, { at: Date.now(), settings })
    if (session.messages().length === 1) capture('thread.started')
    capture('message.sent', settings)
  })

  ctx.on('session.entry', (session, entry) => {
    const turn = running.get(session.id)
    if (turn && entry.type === 'usage') turn.usage = entry.data as UsageRecord
  })

  ctx.on('turn.end', (session, result) => {
    const turn = running.get(session.id)
    if (!turn) return
    running.delete(session.id)
    capture('turn.finished', {
      ...turn.settings,
      ...(turn.usage?.model && { model: turn.usage.model }),
      ...(turn.usage?.source && { provider: turn.usage.source }),
      result: result.stopReason,
      duration_ms: Date.now() - turn.at,
      input_tokens: result.usage.input,
      output_tokens: result.usage.output,
      cache_read_tokens: result.usage.cacheRead,
      cache_write_tokens: result.usage.cacheWrite,
    })
  })
}
