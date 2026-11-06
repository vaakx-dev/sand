import { HandedOver, type Owner } from '@sand/engine/contract'
import type { Act, Gate, Tool, ToolContext } from '@sand/tools/contract'
import { oneLine } from '@sand/util'
import type { Decision } from './contract'
import { decide } from './decide'
import type { Stores } from './store'
import type { Waiters } from './waiters'

export interface GateDeps {
  stores: Stores
  waiters: Waiters
  title(owner: Owner, conversation: string): string
  asked(decision: Decision): void
  cancel(id: string): void
}

const summaryMax = 240

const denied =
  'Not run: the user denied this call. Don’t try to get the same done another way; tell them what you wanted to do, or ask what to do instead.'

const ruled = 'Not run: a rule in Settings → Approvals denies this call. Tell the user what you wanted to do.'

const cancelled = 'Not run: the approval was cancelled.'

const refusalOf = ({ outcome, by }: Decision) => {
  if (outcome === 'denied') return by === 'rule' ? ruled : denied
  return outcome === 'cancelled' ? cancelled : undefined
}

const verdicts = { allow: 'allowed', deny: 'denied', ask: 'waiting' } as const

export const createGate = ({ stores, waiters, title, asked, cancel }: GateDeps): Gate => {
  const record = (act: Act, tool: Tool, { conversation, call, turn }: ToolContext): Decision => {
    const { owner, id, cwd } = conversation
    const ruling = decide(stores.rules.list(), stores.settings.mode(), { owner, conversation: id, cwd, tool: tool.name, act })
    const at = Date.now()
    const outcome = verdicts[ruling.verdict]
    const decision: Decision = {
      id: Bun.randomUUIDv7(),
      owner,
      conversation: id,
      title: title(owner, id),
      turn,
      call: call.id,
      tool: tool.name,
      effect: act.effect,
      summary: oneLine(act.summary ?? JSON.stringify(call.input), summaryMax),
      outcome,
      at,
      ...(outcome !== 'waiting' && { by: ruling.by, decided: at, ...(ruling.rule && { rule: ruling.rule }) }),
    }
    stores.decisions.add(decision)
    if (outcome === 'waiting') asked(decision)
    return decision
  }

  const answer = async (decision: Decision, context: ToolContext) => {
    const done = context.wait({ kind: 'approval', call: context.call.id, title: `Allow ${decision.tool}?`, durable: true })
    try {
      return await waiters.wait(decision.id, context.signal)
    } catch (error) {
      if (context.signal.aborted && !(context.signal.reason instanceof HandedOver)) cancel(decision.id)
      throw error
    } finally {
      done()
    }
  }

  return async (act, tool, context) => {
    const decision = stores.decisions.find(context.turn, context.call.id) ?? record(act, tool, context)
    return refusalOf(decision.outcome === 'waiting' ? await answer(decision, context) : decision)
  }
}
