import type { LLM, LLMRequest } from '@sand/accounts/contract'
import { textOf } from '@sand/chats/prompt'

export const reply = async (llm: LLM, request: LLMRequest, signal?: AbortSignal) => {
  signal?.throwIfAborted()
  for await (const event of llm.stream(request, signal)) {
    if (event.type !== 'done') continue
    signal?.throwIfAborted()
    if (event.stopReason === 'max_tokens') throw new Error('The reply hit the output token limit')
    const text = textOf(event.message.content).trim()
    if (!text) throw new Error('The model sent an empty reply')
    return { text, usage: event.usage, source: event.source }
  }
  throw new Error('The model stream ended without a reply')
}
