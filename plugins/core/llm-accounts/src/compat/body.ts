import type { Effort, LLMRequest } from '../contract'
import type { ToolNames } from './names'
import type { CompatTarget } from './target'
import { loadedTools } from '../http/deferred'
import { chatMessages } from './messages'

const effortOf = (effort: Effort) => (effort === 'xhigh' || effort === 'max' ? 'high' : effort)

const functions = (request: LLMRequest, names: ToolNames) =>
  loadedTools(request.tools).map(tool => ({
    type: 'function',
    function: { name: names.safe(tool.name), description: tool.description, parameters: tool.inputSchema },
  }))

export const compatBody = (target: CompatTarget, request: LLMRequest, names: ToolNames) => ({
  model: target.model,
  messages: chatMessages(request.system, request.messages, !!target.images, names.safe),
  ...(loadedTools(request.tools).length && { tools: functions(request, names) }),
  ...(target.reasoning && request.effort && { reasoning: { effort: effortOf(request.effort) } }),
  stream: true,
  stream_options: { include_usage: true },
})
