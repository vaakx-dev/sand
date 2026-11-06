import type { LLM, LLMRequest } from '@sand/accounts/contract'
import type { CompactionBrief } from '../contract'
import { ask } from './ask'
import { inContextText } from './prompt'

export const summarizeInContext = async (llm: LLM, brief: CompactionBrief, request: LLMRequest, instructions?: string, signal?: AbortSignal) => {
  const text = inContextText(await brief.format(), instructions)
  return ask(llm, brief, { ...request, messages: [...request.messages, { role: 'user', content: [{ type: 'text', text }] }] }, signal)
}
