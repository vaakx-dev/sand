import type { BotStatus } from '@sand/bots/contract'
import type { TurnStatus } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { type Call, outsideOrigins } from '@sand/orchestrator/contract'
import { z } from 'zod'

export const botKind = 'bot'

export const botReplyEntry = 'bot-reply'

export interface BotReplyEntry {
  bot: string
  turn?: string
}

export interface BotRow {
  bot: string
  name: string
  job: string
  status: BotStatus
}

export interface BotAnswer {
  bot: string
  turn?: string
  status: TurnStatus | 'queued'
  reply?: string
  error?: string
}

export interface BotItem {
  seq: number
  at: number
  role: 'user' | 'assistant'
  text: string
  turn?: string
}

export interface BotPage {
  bot: string
  items: BotItem[]
  next: number
  more: boolean
}

export const waitLimit = 25_000
export const readLimit = 200

const callers = 'any'
const one = z.object({ bot: z.string() })

export const botRoster = request('bot.roster', { input: z.object({}), output: type<BotRow[]>(), callers })
export const botAsk = request('bot.ask', {
  input: one.extend({ prompt: z.string().min(1), origin: z.enum(outsideOrigins), clientRequestId: z.string().min(1) }),
  output: type<BotAnswer>(),
  callers,
})
export const botAwait = request('bot.await', {
  input: one.extend({ turn: z.string(), timeoutMs: z.number().int().min(0).max(waitLimit).optional() }),
  output: type<BotAnswer>(),
  callers,
})
export const botRead = request('bot.read', {
  input: one.extend({ after: z.number().int().min(0).optional(), limit: z.number().int().min(1).max(readLimit).optional() }),
  output: type<BotPage>(),
  callers,
})
export const botStarts = request('bot.starts', { input: z.object({}), output: type<Record<string, string>>() })

export const botStartedWire = wireEvent<[thread: string, bot: string]>('bot.started')

const answerGrace = 10_000

export const awaitBot = async (call: Call, answer: BotAnswer, deadline: number): Promise<BotAnswer> => {
  const { bot, turn } = answer
  if (!turn) return answer
  for (;;) {
    const timeoutMs = Math.max(0, Math.min(waitLimit, deadline - Date.now()))
    const found = await call(botAwait, { bot, turn, timeoutMs }, { timeout: timeoutMs + answerGrace })
    if (found.status !== 'running' || Date.now() >= deadline) return found
  }
}
