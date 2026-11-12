import type { BotHold, BotStatus } from '@sand/bots/contract'
import type { TurnStatus } from '@sand/engine/contract'
import { request, type } from '@sand/host-hub/contract'
import { type Call, outsideOrigins } from '@sand/orchestrator/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

export interface BotRow {
  bot: string
  name: string
  job: string
  status: BotStatus
  hold?: BotHold
  projects: string[]
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

export const waitLimit = 25_000

const callers = 'any'
const one = lazy(() => z.object({ bot: z.string() }))

export const botRoster = request('bot.roster', { input: () => z.object({}), output: type<BotRow[]>(), callers })
export const botAsk = request('bot.ask', {
  input: () => one().extend({ prompt: z.string().min(1), origin: z.enum(outsideOrigins), clientRequestId: z.string().min(1) }),
  output: type<BotAnswer>(),
  callers,
})
export const botAwait = request('bot.await', {
  input: () => one().extend({ turn: z.string(), timeoutMs: z.number().int().min(0).max(waitLimit).optional() }),
  output: type<BotAnswer>(),
  callers,
})
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
