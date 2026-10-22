import type { LLM, LLMRequest } from '@sand/accounts/contract'
import { ask } from './ask'
import { inContextText } from './prompt'

export const summarizeInContext = (llm: LLM, request: LLMRequest, instructions?: string, signal?: AbortSignal) =>
  ask(llm, { ...request, messages: [...request.messages, { role: 'user', content: [{ type: 'text', text: inContextText(instructions) }] }] }, signal)
