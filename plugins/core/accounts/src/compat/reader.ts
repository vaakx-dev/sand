import type { StopReason } from '@sand/chats/contract'
import { cacheLifetimes, type LLMEvent, type Usage, writtenTtl } from '../contract'
import { isRecord } from '@sand/util'
import type { CompatChunk, CompatUsage } from './chunks'
import { Collector } from './collect'

const usageOf = (raw: CompatUsage | null | undefined): Usage => {
  const cached = raw?.prompt_tokens_details?.cached_tokens ?? 0
  const written = raw?.prompt_tokens_details?.cache_write_tokens ?? 0
  return { input: Math.max(0, (raw?.prompt_tokens ?? 0) - cached - written), output: raw?.completion_tokens ?? 0, cacheRead: cached, cacheWrite: written }
}

const lifetimesOf = (model: string) => (model.startsWith('openai/') ? cacheLifetimes.openai : cacheLifetimes.anthropic)

const stopOf = (reason: string, calls: boolean): StopReason => {
  if (calls || reason === 'tool_calls' || reason === 'function_call') return 'tool_use'
  if (reason === 'length') return 'max_tokens'
  if (reason === 'content_filter') return 'refusal'
  return reason === 'stop' ? 'end_turn' : reason
}

const errorText = (error: unknown) => {
  if (typeof error === 'string') return error
  const own = isRecord(error) ? (error.message ?? error.code) : undefined
  return own ?? JSON.stringify(error)
}

const failure = (error: unknown, name: string) => new Error(`${name} error: ${errorText(error)}`)

const text = (value: unknown) => (typeof value === 'string' ? value : '')

export async function* readCompat(stream: AsyncIterable<CompatChunk>, model: string, name: string): AsyncIterable<LLMEvent> {
  const collector = new Collector()
  let started = false
  let finish: string | undefined
  let usage: CompatUsage | undefined

  for await (const chunk of stream) {
    if (chunk.error) throw failure(chunk.error, name)
    if (!started) {
      started = true
      yield { type: 'start', model: chunk.model || model }
    }
    if (chunk.usage) usage = chunk.usage
    for (const choice of chunk.choices ?? []) {
      if ((choice.index ?? 0) !== 0) continue
      const delta = choice.delta ?? {}
      const thinking = text(delta.reasoning) || text(delta.reasoning_content)
      if (thinking) yield* collector.text('thinking', thinking)
      const content = text(delta.content) || text(delta.refusal)
      if (content) yield* collector.text('text', content)
      const calls = Array.isArray(delta.tool_calls) ? delta.tool_calls : []
      for (const [position, call] of calls.entries()) yield* collector.tool(call, position)
      if (choice.finish_reason === 'error') throw failure(choice.error ?? 'the response stopped with an error', name)
      if (choice.finish_reason) finish = choice.finish_reason
    }
  }

  if (!started) throw new Error(`${name} sent an empty response`)
  if (!finish) throw new Error(`${name} stream ended before the response finished`)
  yield* collector.finish()
  const used = usageOf(usage)
  const cacheTtlMs = writtenTtl(used, lifetimesOf(model))
  yield {
    type: 'done',
    message: { role: 'assistant', content: collector.blocks },
    stopReason: stopOf(finish, collector.hasCalls),
    usage: used,
    ...(cacheTtlMs && { cacheTtlMs }),
  }
}
