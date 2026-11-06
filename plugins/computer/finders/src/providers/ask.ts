import type { Effort, LLM, LLMEvent } from '@sand/accounts/contract'
import type { ModelContent } from '@sand/chats/contract'
import type { TokenUsage } from '../contract'

export interface Question {
  model: string
  effort?: Effort
  system: string
  content: ModelContent[]
}

export interface Reply {
  text: string
  usage: TokenUsage
  costUsd: number
}

type Done = Extract<LLMEvent, { type: 'done' }>

const replyOf = (llm: LLM, model: string, { message, usage }: Done): Reply => {
  const price = llm.price?.(model)
  const cost = price ? usage.input * price.input + usage.output * price.output + usage.cacheRead * price.cacheRead + usage.cacheWrite * price.cacheWrite : 0
  return {
    text: message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join(''),
    usage: { inputTokens: usage.input + usage.cacheRead + usage.cacheWrite, outputTokens: usage.output },
    costUsd: cost / 1e6,
  }
}

export const ask = async (llm: LLM, { model, effort, system, content }: Question, signal?: AbortSignal): Promise<Reply> => {
  const request = { system, messages: [{ role: 'user' as const, content }], tools: [], model, ...(effort && { effort }) }
  for await (const event of llm.stream(request, signal)) if (event.type === 'done') return replyOf(llm, model, event)
  throw new Error(`${model} ended without a reply`)
}
