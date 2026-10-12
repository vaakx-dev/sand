import type { Message } from '@sand/messages'
import type { Effort, LLMRequest } from '../contract'
import { createHash } from 'node:crypto'
import { loadedTools } from '../http/deferred'
import { openaiInput } from './input'
import { describeOpenAI, takesImages } from './models'

const effortOf = (model: string, wanted: Effort | undefined): Effort => {
  const info = describeOpenAI(model)
  return wanted && info.efforts.includes(wanted) ? wanted : (info.defaultEffort ?? 'medium')
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

export const openaiBody = (request: LLMRequest, model: string) => ({
  model,
  instructions: request.system,
  input: openaiInput(request.messages, takesImages(model)),
  ...(loadedTools(request.tools).length && { tools: functions(request) }),
  tool_choice: 'auto',
  parallel_tool_calls: true,
  store: false,
  stream: true,
  reasoning: { effort: effortOf(model, request.effort), summary: 'auto' },
  include: ['reasoning.encrypted_content'],
  prompt_cache_key: cacheKey(request),
})
