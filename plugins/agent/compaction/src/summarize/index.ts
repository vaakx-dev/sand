import type { LLM, LLMRequest, SourceRef, Usage } from '@sand/accounts/contract'
import type { Message } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { sumUsage } from '@sand/usage/records'
import { ask } from './ask'
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

const chunks = (parts: string[], max: number) => {
  const groups: string[][] = []
  let current: string[] = []
  let size = 0
  for (const part of parts) {
    if (current.length && size + part.length > max) {
      groups.push(current)
      current = []
      size = 0
    }
    current.push(part)
    size += part.length
  }
  return [...groups, current]
}

const transcriptRequest = (text: string, model?: string): LLMRequest => ({
  system,
  messages: [{ role: 'user', content: [{ type: 'text', text }] }],
  tools: [],
  model,
})

export const summarize = async (llm: LLM, media: Media, { model, messages, previous, instructions, limit, signal }: SummaryInput) => {
  const parts = messages.map(serialize(media)).filter(Boolean)
  let summary = previous
  let usage: Usage | undefined
  let source: SourceRef | undefined
  for (const chunk of chunks(parts, Math.floor(limit * chunkShare * charsPerToken))) {
    const reply = await ask(llm, transcriptRequest(promptText(chunk.join('\n\n'), summary, instructions), model), signal)
    summary = reply.summary
    usage = usage ? sumUsage(usage, reply.usage) : reply.usage
    source = reply.source ?? source
  }
  if (!summary) throw new Error('There was nothing to summarize')
  return { summary, usage, source }
}
