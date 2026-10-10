import type { StopReason, Usage } from '@sand/messages'
import type { LLMEvent } from '../contract'
import { Collector } from './collect'

const usageOf = (raw: any): Usage => {
  const cached = raw?.prompt_tokens_details?.cached_tokens ?? 0
  return { input: Math.max(0, (raw?.prompt_tokens ?? 0) - cached), output: raw?.completion_tokens ?? 0, cacheRead: cached, cacheWrite: 0 }
}

const stopOf = (reason: string, calls: boolean): StopReason => {
  if (calls || reason === 'tool_calls' || reason === 'function_call') return 'tool_use'
  if (reason === 'length') return 'max_tokens'
  if (reason === 'content_filter') return 'refusal'
  return reason === 'stop' ? 'end_turn' : reason
}

const failure = (error: any, name: string) => {
  const detail = typeof error === 'string' ? error : (error?.message ?? error?.code ?? JSON.stringify(error))
  return new Error(`${name} error: ${detail}`)
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

export async function* readCompat(stream: AsyncIterable<any>, model: string, name: string): AsyncIterable<LLMEvent> {
  const collector = new Collector()
  let started = false
  let finish: string | undefined
  let usage: any

  for await (const chunk of stream) {
    if (chunk?.error) throw failure(chunk.error, name)
    if (!started) {
      started = true
      yield { type: 'start', model: chunk?.model || model }
    }
    if (chunk?.usage) usage = chunk.usage
    for (const choice of chunk?.choices ?? []) {
      if ((choice?.index ?? 0) !== 0) continue
      const delta = choice.delta ?? {}
      const thinking = text(delta.reasoning) || text(delta.reasoning_content)
      if (thinking) yield* collector.text('thinking', thinking)
      const content = text(delta.content) || text(delta.refusal)
      if (content) yield* collector.text('text', content)
      const calls: any[] = Array.isArray(delta.tool_calls) ? delta.tool_calls : []
      for (const [position, call] of calls.entries()) yield* collector.tool(call, position)
      if (choice.finish_reason === 'error') throw failure(choice.error ?? 'the response stopped with an error', name)
      if (choice.finish_reason) finish = choice.finish_reason
    }
  }

  if (!started) throw new Error(`${name} sent an empty response`)
  if (!finish) throw new Error(`${name} stream ended before the response finished`)
  yield* collector.finish()
  yield {
    type: 'done',
    message: { role: 'assistant', content: collector.blocks },
    stopReason: stopOf(finish, collector.hasCalls),
    usage: usageOf(usage),
  }
}
