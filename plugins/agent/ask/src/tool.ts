import type { Tool } from '@sand/tools/contract'
import type { AskQuestion } from './contract'
import { replyText, toolName } from './choices'
import { askInput } from './schema'
import type { Waiting } from './waiting'

const description = [
  'Ask the user 1-4 questions and wait for the answers.',
  "Use it when a decision is the user's to make (a preference, a trade-off, a go-ahead for something risky) and guessing would waste work. Don't ask what you can find out yourself, and ask everything you need in one call.",
  'The user can always type their own answer instead of picking an option, or skip.',
].join(' ')

export const askTool = (waiting: Waiting): Tool<typeof askInput> => ({
  name: toolName,
  description,
  input: askInput,
  async run({ questions }, { session, call, signal }) {
    if (session.kind === 'agent') throw new Error("Subagents can't ask the user. Decide yourself and state the assumption in your report.")
    const answers = await waiting.wait(call.id, session.id, signal)
    return replyText(questions satisfies AskQuestion[], answers)
  },
})
