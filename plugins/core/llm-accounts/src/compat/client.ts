import type { LLMEvent, LLMRequest } from '../contract'
import { restoreNames } from '../claude/tools'
import { frames } from '../codex/sse'
import { send } from '../http/send'
import { reaching } from '../reach'
import { compatBody } from './body'
import { toolNames } from './names'
import { readCompat } from './reader'
import { compatHeaders, compatUrl, type CompatTarget } from './target'

export type { CompatTarget } from './target'

const namesOf = (request: LLMRequest) => [
  ...request.tools.map(tool => tool.name),
  ...request.messages.flatMap(message => message.content.flatMap(block => (block.type === 'tool_call' ? [block.name] : []))),
]

export const createCompat = ({ retries }: { retries: number }) => ({
  async *stream(target: CompatTarget, request: LLMRequest, signal?: AbortSignal): AsyncIterable<LLMEvent> {
    const names = toolNames(namesOf(request))
    const url = compatUrl(target)
    const body = JSON.stringify(compatBody(target, request, names))
    const response = await reaching(url, target.name, signal, () => send(url, { method: 'POST', headers: compatHeaders(target), body }, { retries, signal }))
    if (!response.body) throw new Error(`${target.name} sent an empty response`)
    yield* restoreNames(readCompat(frames(response.body, target.name), target.model, target.name), names.original)
  },
})
