import type { Media } from '@sand/media/contract'
import type { LLMRequest } from '../contract'
import type { ToolNames } from './names'
import { type CompatTarget, isOpenRouter } from './target'
import { loadedTools } from '../http/deferred'
import { chatMessages } from './messages'

const functions = (request: LLMRequest, names: ToolNames) =>
  loadedTools(request.tools).map(tool => ({
    type: 'function',
    function: { name: names.safe(tool.name), description: tool.description, parameters: tool.inputSchema },
  }))

export const compatBody = (target: CompatTarget, request: LLMRequest, names: ToolNames, media: Media) => ({
  model: target.model,
  messages: chatMessages(request.system, request.messages, { media, images: !!target.images }, names.safe),
  ...(loadedTools(request.tools).length && { tools: functions(request, names) }),
  ...(request.effort && target.efforts.includes(request.effort) && { reasoning: { effort: request.effort } }),
  stream: true,
  stream_options: { include_usage: true },
  ...(isOpenRouter(target.base) && { cache_control: { type: 'ephemeral' } }),
})
