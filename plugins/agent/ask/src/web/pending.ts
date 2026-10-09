import type { Message, ToolCallBlock } from '@sand/messages'
import type { Thread } from '@sand/web-client/contract'
import type { AskKind, AskOption, AskQuestion } from '../contract'
import { derive, type Pulse } from '@sand/dom'
import type { Context } from 'drydock'
import { toolName } from '../choices'
import type { ServerAsks } from './asks'

export interface PendingAsk {
  thread: string
  call: string
  questions: AskQuestion[]
}

const kinds = new Set<AskKind>(['single', 'multi', 'confirm', 'rank', 'text'])

const text = (value: unknown) => (typeof value === 'string' ? value : undefined)

const optionOf = (value: unknown): AskOption[] => {
  const raw = value as Record<string, unknown> | null
  const label = text(raw?.label)
  if (!label) return []
  return [{ label, description: text(raw?.description), preview: text(raw?.preview), recommended: raw?.recommended === true }]
}

const questionOf = (value: unknown): AskQuestion[] => {
  const raw = value as Record<string, unknown> | null
  const name = text(raw?.name)
  const question = text(raw?.question)
  if (!name || !question) return []
  const type = kinds.has(raw?.type as AskKind) ? (raw!.type as AskKind) : 'single'
  const options = Array.isArray(raw?.options) ? raw.options.flatMap(optionOf) : []
  return [{ name, question, type, options, detail: text(raw?.detail), risky: raw?.risky === true }]
}

export const questionsOf = (input: unknown) => {
  const list = (input as { questions?: unknown } | null)?.questions
  return Array.isArray(list) ? list.flatMap(questionOf) : []
}

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
  return derive(() => (JSON.parse(key.get()) as PendingAsk | null) ?? undefined)
}
