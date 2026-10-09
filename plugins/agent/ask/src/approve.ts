import type { ToolAsk } from '@sand/loops/contract'
import type { ToolCallBlock } from '@sand/messages'
import type { Handler } from 'drydock'
import type { AskQuestion, Asks } from './contract'

const approval = (call: ToolCallBlock, decision: ToolAsk): AskQuestion => ({
  name: 'approve',
  type: 'confirm',
  question: (decision.question ?? `Run ${call.name}?`).slice(0, 300),
  options: [],
  detail: `${call.name} ${JSON.stringify(call.input ?? {})}`.slice(0, 1000),
  risky: true,
})

export const approveTool =
  (asks: Asks): Handler<'tool.approve'> =>
  async (call, decision, session, signal) => {
    if (session.kind === 'agent') return undefined
    try {
      const answers = await asks.ask(session, [approval(call, decision)], 'tool.approve', signal)
      return answers?.[0]?.picked?.[0] === 0
    } catch {
      return signal.aborted ? false : undefined
    }
  }
