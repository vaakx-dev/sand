import type { BotHold, BotStatus } from '@sand/bots/contract'
import { type HistoryPage, historyReading } from '@sand/chats/contract'
import type { TurnStatus } from '@sand/engine/contract'
import { request, type } from '@sand/host-hub/contract'
import { type Call, outsideOrigins } from '@sand/orchestrator/contract'
import { z } from 'zod'

export interface BotRow {
  bot: string
  name: string
  job: string
  status: BotStatus
  hold?: BotHold
  project: string | null
  budget: number | null
  spent: number
}

export interface BotAnswer {
  bot: string
  turn?: string
  status: TurnStatus | 'queued'
  reply?: string
  error?: string
  reported?: true
}

export interface BotPage extends HistoryPage {
  bot: string
}

export const waitLimit = 25_000
export const jobLimit = 2_000

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
  input: historyReading.extend({ bot: z.string().optional() }),
  output: type<BotPage>(),
  callers,
})
const setInput = z.object({
  bot: z.string().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  job: z.string().trim().min(1).max(jobLimit).optional(),
  project: z.string().min(1).nullable().optional(),
  paused: z.boolean().optional(),
  budget: z.number().positive().max(1_000_000).nullable().optional(),
})

export type BotSet = z.infer<typeof setInput>

export const botSet = request('bot.set', { input: setInput, output: type<BotRow>(), callers })

const answerGrace = 10_000

export const awaitBot = async (call: Call, answer: BotAnswer, deadline: number, signal?: AbortSignal): Promise<BotAnswer> => {
  const { bot, turn } = answer
  if (!turn || answer.reported) return answer
  for (;;) {
    signal?.throwIfAborted()
    const timeoutMs = Math.max(0, Math.min(waitLimit, deadline - Date.now()))
    const found = await call(botAwait, { bot, turn, timeoutMs }, { timeout: timeoutMs + answerGrace })
    if (found.status !== 'running' || Date.now() >= deadline) return found
  }
}
