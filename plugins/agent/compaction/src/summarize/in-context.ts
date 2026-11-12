import type { LLM, LLMRequest } from '@sand/accounts/contract'
import { sumUsage } from '@sand/usage/contract'
import type { CompactionBrief } from '../contract'
import { ask } from './ask'
import { inContextText } from './prompt'

export const summarizeInContext = async (llm: LLM, brief: CompactionBrief, request: LLMRequest, instructions?: string) => {
  const prepared = await brief.prepare?.(request)
  const text = inContextText(await brief.format(), instructions)
  const summarized = await ask(llm, brief, { ...request, messages: [...request.messages, { role: 'user', content: [{ type: 'text', text }] }] })
  return prepared ? { ...summarized, usage: sumUsage(prepared, summarized.usage) } : summarized
}
