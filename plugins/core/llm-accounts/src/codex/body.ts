import type { Effort, LLMRequest, Message } from '@sand/protocol'
import { createHash } from 'node:crypto'
import { codexInput } from './input'
import { describeCodex, takesImages } from './models'

const effortOf = (model: string, wanted: Effort | undefined): Effort => {
  const info = describeCodex(model)
  return wanted && info.efforts.includes(wanted) ? wanted : (info.defaultEffort ?? 'medium')
}

const firstPrompt = (messages: Message[]) => JSON.stringify(messages.find(message => message.role === 'user')?.content ?? [])

export const cacheKey = (request: LLMRequest) =>
  createHash('sha256').update(request.system).update('\n').update(firstPrompt(request.messages)).digest('hex').slice(0, 32)

export const codexBody = (request: LLMRequest, model: string) => ({
  model,
  instructions: request.system,
  input: codexInput(request.messages, takesImages(model)),
  ...(request.tools.length && {
    tools: request.tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      strict: false,
    })),
  }),
  tool_choice: 'auto',
  parallel_tool_calls: true,
  store: false,
  stream: true,
  reasoning: { effort: effortOf(model, request.effort), summary: 'auto' },
  include: ['reasoning.encrypted_content'],
  prompt_cache_key: cacheKey(request),
})
