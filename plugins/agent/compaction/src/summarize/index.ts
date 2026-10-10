import type { LLM, SourceRef } from '@sand/llm-accounts/contract'
import type { Message, Usage } from '@sand/messages'
import { promptText, system } from './prompt'
import { serialize } from './serialize'

const charsPerToken = 4
const chunkShare = 0.6

export interface SummaryInput {
  model?: string
  messages: Message[]
  previous?: string
  instructions?: string
  limit: number
  signal?: AbortSignal
}

const chunks = (parts: string[], max: number) =>
  parts.reduce<string[][]>(
    (groups, part) => {
      const current = groups.at(-1)!
      const size = current.reduce((sum, item) => sum + item.length, 0)
      if (current.length && size + part.length > max) groups.push([part])
      else current.push(part)
      return groups
    },
    [[]],
  )

const add = (a: Usage | undefined, b: Usage): Usage =>
  a ? { input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite } : b

const ask = async (llm: LLM, text: string, model?: string, signal?: AbortSignal) => {
  const request = { system, messages: [{ role: 'user', content: [{ type: 'text', text }] } satisfies Message], tools: [], model }
  for await (const event of llm.stream(request, signal)) {
    if (event.type !== 'done') continue
    if (event.stopReason === 'max_tokens') throw new Error('The summary hit the output token limit')
    const summary = event.message.content.flatMap(block => (block.type === 'text' ? [block.text] : [])).join('\n').trim()
    if (!summary) throw new Error('Compaction produced an empty summary')
    return { summary, usage: event.usage, source: event.source }
  }
  throw new Error('The summary stream ended without a reply')
}

export const summarize = async (llm: LLM, { model, messages, previous, instructions, limit, signal }: SummaryInput) => {
  const parts = messages.map(serialize).filter(Boolean)
  let summary = previous
  let usage: Usage | undefined
  let source: SourceRef | undefined
  for (const chunk of chunks(parts, Math.floor(limit * chunkShare * charsPerToken))) {
    const reply = await ask(llm, promptText(chunk.join('\n\n'), summary, instructions), model, signal)
    summary = reply.summary
    usage = add(usage, reply.usage)
    source = reply.source ?? source
  }
  if (!summary) throw new Error('There was nothing to summarize')
  return { summary, usage, source }
}
