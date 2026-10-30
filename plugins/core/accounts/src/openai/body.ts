import type { Message } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import type { Effort, LLMRequest, ModelInfo } from '../contract'
import { createHash } from 'node:crypto'
import { loadedTools } from '../http/deferred'
import { openaiInput } from './input'

const reasoningOf = ({ efforts, defaultEffort }: ModelInfo, wanted: Effort | undefined) => {
  if (!efforts.length) return {}
  const effort = wanted && efforts.includes(wanted) ? wanted : defaultEffort
  return { reasoning: { ...(effort && { effort }), summary: 'auto' }, include: ['reasoning.encrypted_content'] }
}

const firstPrompt = (messages: Message[]) => JSON.stringify(messages.find(message => message.role === 'user')?.content ?? [])

const cacheKey = (request: LLMRequest) =>
  createHash('sha256').update(request.system).update('\n').update(firstPrompt(request.messages)).digest('hex').slice(0, 32)

const functions = (request: LLMRequest) =>
  loadedTools(request.tools).map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    strict: false,
  }))

export const openaiBody = (request: LLMRequest & { model: string }, model: ModelInfo, media: Media) => ({
  model: request.model,
  instructions: request.system,
  input: openaiInput(request.messages, { media, images: !!model.images }),
  ...(loadedTools(request.tools).length && { tools: functions(request) }),
  tool_choice: 'auto',
  parallel_tool_calls: true,
  store: false,
  stream: true,
  ...reasoningOf(model, request.effort),
  prompt_cache_key: cacheKey(request),
})
