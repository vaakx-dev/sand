import type { Message, ToolCallBlock } from '@sand/messages'
import type { Thread } from '@sand/web-client/contract'
import type { AskKind, AskOption, AskQuestion } from '../contract'
import { isRecord } from '@sand/kit'
import { derive, type Pulse } from '@sand/dom'
import type { Context } from 'drydock'
import { toolName } from '../reply'
import type { ServerAsks } from './asks'

export interface PendingAsk {
  thread: string
  call: string
  questions: AskQuestion[]
}

const kinds: AskKind[] = ['single', 'multi', 'confirm', 'rank', 'text']

const text = (value: unknown) => (typeof value === 'string' ? value : undefined)

const optionOf = (raw: unknown): AskOption[] => {
  if (!isRecord(raw)) return []
  const label = text(raw.label)
  if (!label) return []
  return [{ label, description: text(raw.description), preview: text(raw.preview), recommended: raw.recommended === true }]
}

const questionOf = (raw: unknown): AskQuestion[] => {
  if (!isRecord(raw)) return []
  const name = text(raw.name)
  const question = text(raw.question)
  if (!name || !question) return []
  const type = kinds.find(kind => kind === raw.type) ?? 'single'
  const options = Array.isArray(raw.options) ? raw.options.flatMap(optionOf) : []
  return [{ name, question, type, options, detail: text(raw.detail), risky: raw.risky === true }]
}

export const questionsOf = (input: unknown) => (isRecord(input) && Array.isArray(input.questions) ? input.questions.flatMap(questionOf) : [])

const waitingCall = (message: Message, answered: Map<string, unknown>) =>
  message.content.find((block): block is ToolCallBlock => block.type === 'tool_call' && block.name === toolName && !answered.has(block.id))

const toolAsk = (ctx: Context<'threads'>, thread: Thread): PendingAsk | undefined => {
  if (!thread.running) return undefined
  const last = ctx.threads.path(thread.id).findLast(entry => entry.type === 'message')?.data as Message | undefined
  if (last?.role !== 'assistant') return undefined
  const call = waitingCall(last, thread.tools.results)
  const questions = call ? questionsOf(call.input) : []
  return call && questions.length ? { thread: thread.id, call: call.id, questions } : undefined
}

const serverAsk = (asks: ServerAsks, thread: Thread): PendingAsk | undefined => {
  const pending = asks.forThread(thread.id)
  return pending && { thread: thread.id, call: pending.id, questions: pending.questions }
}

const pendingOf = (ctx: Context<'threads'>, asks: ServerAsks): PendingAsk | undefined => {
  const thread = ctx.threads.current()
  return thread && (toolAsk(ctx, thread) ?? serverAsk(asks, thread))
}

export const pendingAsk = (ctx: Context<'threads'>, changes: Pulse, asks: ServerAsks) => {
  const key = changes.read(() => JSON.stringify(pendingOf(ctx, asks) ?? null))
  return derive((): PendingAsk | undefined => JSON.parse(key.get()) ?? undefined)
}
