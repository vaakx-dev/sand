import type { TurnResult, UsageRecord } from '@sand/loops/contract'
import type { Entry } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'

interface Running {
  at: number
  settings: Record<string, unknown>
  usage?: UsageRecord
}

export const createTurnStats = (ctx: Context) => {
  const running = new Map<string, Running>()

  const start = (session: Session) => {
    const effective = ctx.modelSettings?.effective(session)
    const model = effective?.model
    const settings = { model, provider: ctx.llm?.provider?.(model)?.id, effort: effective?.effort, loop: ctx.loops?.state(session).name }
    running.set(session.id, { at: Date.now(), settings })
    return settings
  }

  const entry = (session: Session, added: Entry) => {
    const turn = running.get(session.id)
    if (turn && added.type === 'usage') turn.usage = added.data as UsageRecord
  }

  const finish = (session: Session, result: TurnResult) => {
    const turn = running.get(session.id)
    if (!turn) return
    running.delete(session.id)
    return {
      ...turn.settings,
      ...(turn.usage?.model && { model: turn.usage.model }),
      ...(turn.usage?.source && { provider: turn.usage.source }),
      result: result.stopReason,
      duration_ms: Date.now() - turn.at,
      input_tokens: result.usage.input,
      output_tokens: result.usage.output,
      cache_read_tokens: result.usage.cacheRead,
      cache_write_tokens: result.usage.cacheWrite,
    }
  }

  return { start, entry, finish }
}
