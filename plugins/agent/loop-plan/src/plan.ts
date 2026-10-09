import type { Turn, TurnOutcome } from '@sand/loops/contract'
import type { ToolCallBlock, ToolResultBlock } from '@sand/messages'
import { callsOf, refused, skip, textOf, truncated } from './calls'

export interface PlanOptions {
  tools: string[]
  steps: number
}

const suffix = '\n\nPlan first: investigate read-only, then reply with a numbered plan and no edits.'

const request = async (turn: Turn, options: PlanOptions) => {
  const built = await turn.hooks.build()
  return { ...built, system: `${built.system}${suffix}`, tools: built.tools.filter(tool => options.tools.includes(tool.name)) }
}

const send = async (turn: Turn, options: PlanOptions) => {
  try {
    return await turn.hooks.stream(await request(turn, options))
  } catch (error) {
    if (!(await turn.hooks.overflow(error))) throw error
    return turn.hooks.stream(await request(turn, options))
  }
}

const readOnly = async (turn: Turn, calls: ToolCallBlock[], options: PlanOptions) => {
  const allowed = calls.filter(call => options.tools.includes(call.name))
  const ran = allowed.length ? await turn.hooks.tools(allowed) : []
  const blocked = skip(
    calls.filter(call => !options.tools.includes(call.name)),
    `Not run: while planning only these tools run: ${options.tools.join(', ')}.`,
  )
  const results = new Map([...ran, ...blocked].map(result => [result.callId, result]))
  return calls.flatMap(call => results.get(call.id) ?? [])
}

export const plan = async (turn: Turn, outcome: TurnOutcome, options: PlanOptions): Promise<ToolResultBlock[] | undefined> => {
  for (let step = 1; ; step++) {
    turn.signal.throwIfAborted()
    const done = await send(turn, options)
    const message = await turn.hooks.respond(done.message)
    outcome.stopReason = done.stopReason
    outcome.text = textOf(message)
    const calls = callsOf(message)
    if (done.stopReason === 'refusal') {
      if (calls.length) turn.hooks.append({ role: 'user', content: skip(calls, refused) })
      return undefined
    }
    if (!calls.length) {
      if (done.stopReason === 'pause_turn' && step < options.steps) continue
      return []
    }
    const results = done.stopReason === 'max_tokens' ? skip(calls, truncated) : await readOnly(turn, calls, options)
    if (step >= options.steps) return results
    turn.hooks.append({ role: 'user', content: [...results, ...(await turn.hooks.inbox())] })
  }
}
