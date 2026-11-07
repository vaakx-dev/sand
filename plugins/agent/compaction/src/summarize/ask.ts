import type { LLM, LLMRequest } from '@sand/accounts/contract'
import { textOf, type Message } from '@sand/chats/contract'
import { sumUsage } from '@sand/usage/contract'
import type { CompactionBrief } from '../contract'

const said = (role: Message['role'], text: string): Message => ({ role, content: [{ type: 'text', text }] })

const reply = async (llm: LLM, request: LLMRequest) => {
  for await (const event of llm.stream(request)) {
    if (event.type !== 'done') continue
    if (event.stopReason === 'max_tokens') throw new Error('The summary hit the output token limit')
    const text = textOf(event.message.content).trim()
    if (!text) throw new Error('Compaction produced an empty summary')
    return { text, usage: event.usage, source: event.source }
  }
  throw new Error('The summary stream ended without a reply')
}

export const ask = async (llm: LLM, brief: CompactionBrief, request: LLMRequest) => {
  const first = await reply(llm, request)
  const problem = brief.check?.(first.text)
  if (!problem) return { summary: await brief.accept(first.text), usage: first.usage, source: first.source }
  const second = await reply(llm, { ...request, messages: [...request.messages, said('assistant', first.text), said('user', problem)] })
  return { summary: await brief.accept(second.text), usage: sumUsage(first.usage, second.usage), source: second.source ?? first.source }
}
