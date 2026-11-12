import type { LLM, LLMRequest, Usage } from '@sand/accounts/contract'
import type { Message, ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import type { Conversation } from '@sand/engine/contract'
import type { Tools } from '@sand/tools/contract'
import { sumUsage } from '@sand/usage/contract'

interface CheckOptions {
  llm: LLM
  tools: Tools
  conversation: Conversation
}

const MAX_STEPS = 12
const TIMEOUT_MS = 5 * 60_000
const CHECK_TURN = 'memory-check'

const ASK = 'Your memory and notes should hold only what is still true. Check them against the code, files and past chats, and fix or drop what is wrong.'

const said = (text: string): Message => ({ role: 'user', content: [{ type: 'text', text }] })

const callsIn = ({ content }: Message) => content.filter((block): block is ToolCallBlock => block.type === 'tool_call')

const replyTo = async (llm: LLM, request: LLMRequest, signal: AbortSignal) => {
  for await (const event of llm.stream(request, signal)) if (event.type === 'done') return event
  throw new Error('The memory check ended without a reply')
}

const memoryCheck = ({ llm, tools, conversation }: CheckOptions) => {
  const answer = async (calls: ToolCallBlock[], signal: AbortSignal) => {
    const results: ToolResultBlock[] = []
    for (const call of calls) results.push(await tools.run(call, { cwd: conversation.cwd, signal, conversation, turn: CHECK_TURN, progress() {}, wait: () => () => {} }))
    return results
  }

  return async (request: LLMRequest): Promise<Usage | undefined> => {
    const signal = AbortSignal.timeout(TIMEOUT_MS)
    let messages = [...request.messages, said(ASK)]
    let usage: Usage | undefined
    for (let step = 0; step < MAX_STEPS; step++) {
      const { message, usage: spent } = await replyTo(llm, { ...request, messages }, signal)
      usage = usage ? sumUsage(usage, spent) : spent
      const calls = callsIn(message)
      if (!calls.length) return usage
      messages = [...messages, message, { role: 'user', content: await answer(calls, signal) }]
    }
    return usage
  }
}

export { memoryCheck }
