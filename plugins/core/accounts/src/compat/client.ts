import type { Media } from '@sand/media/contract'
import type { LLMEvent, LLMRequest } from '../contract'
import { send } from '../http/send'
import { sseEvents } from '../http/sse'
import { restoreNames } from '../http/tool-names'
import { reaching } from '../reach'
import { compatBody } from './body'
import type { CompatChunk } from './chunks'
import { toolNames } from './names'
import { readCompat } from './reader'
import { compatHeaders, compatUrl, type CompatTarget } from './target'

const namesOf = (request: LLMRequest) => [
  ...request.tools.map(tool => tool.name),
  ...request.messages.flatMap(message => message.content.flatMap(block => (block.type === 'tool_call' ? [block.name] : []))),
]

export type Compat = ReturnType<typeof createCompat>

export const createCompat = ({ retries, media }: { retries: number; media: Media }) => ({
  async *stream(target: CompatTarget, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const names = toolNames(namesOf(request))
    const url = compatUrl(target)
    const body = JSON.stringify(compatBody(target, request, names, media))
    const response = await reaching(url, target.name, signal, () => send(url, { method: 'POST', headers: compatHeaders(target), body }, { retries, signal }))
    if (!response.body) throw new Error(`${target.name} sent an empty response`)
    yield* restoreNames(readCompat(sseEvents<CompatChunk>(response.body, target.name), target.model, target.name), names.original)
  },
})
