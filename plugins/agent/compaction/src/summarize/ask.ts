import type { LLM, LLMRequest } from '@sand/accounts/contract'
import { textOf } from '@sand/chats/prompt'

export const ask = async (llm: LLM, request: LLMRequest, signal?: AbortSignal) => {
  for await (const event of llm.stream(request, signal)) {
    if (event.type !== 'done') continue
    if (event.stopReason === 'max_tokens') throw new Error('The summary hit the output token limit')
    const summary = textOf(event.message.content).trim()
    if (!summary) throw new Error('Compaction produced an empty summary')
    return { summary, usage: event.usage, source: event.source }
  }
  throw new Error('The summary stream ended without a reply')
}
