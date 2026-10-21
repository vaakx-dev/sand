import { callsOf, refused, skip, textOf, truncated } from '@sand/chats/prompt'
import type { Message, StopReason, ToolResultBlock } from '@sand/chats/contract'
import type { Turn, TurnOutcome } from './turn'

const appendInbox = async ({ hooks }: Turn) => {
  const steering = await hooks.inbox()
  if (!steering.length) return false
  hooks.append({ role: 'user', content: steering })
  return true
}

const answer = async ({ hooks }: Turn, results: ToolResultBlock[]) => {
  hooks.append({ role: 'user', content: [...results, ...(await hooks.inbox())] })
}

const answerCalls = async (turn: Turn, message: Message, stopReason: StopReason) => {
  const pending = callsOf(message)
  if (!pending.length) return stopReason === 'pause_turn' || appendInbox(turn)
  if (stopReason === 'refusal') {
    await answer(turn, skip(pending, refused))
    return false
  }
  await answer(turn, stopReason === 'max_tokens' ? skip(pending, truncated) : await turn.hooks.tools(pending))
  return true
}

const step = async (turn: Turn, outcome: TurnOutcome) => {
  turn.signal.throwIfAborted()
  const { message, stopReason } = await turn.hooks.send()
  turn.hooks.respond(message)
  outcome.stopReason = stopReason
  outcome.text = textOf(message.content)
  return answerCalls(turn, message, stopReason)
}

export const runReact = async (turn: Turn): Promise<TurnOutcome> => {
  const outcome: TurnOutcome = { stopReason: 'end_turn', text: '' }
  do {
    let more = true
    while (more) more = await step(turn, outcome)
  } while (await appendInbox(turn))
  return outcome
}
