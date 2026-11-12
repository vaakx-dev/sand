import type { LiveBlock, LiveEvent } from '@sand/accounts/contract'
import type { EntryPage } from '@sand/bots/contract'
import { promptInput } from '@sand/chats/contract'
import type { PendingItem, SendInput, SendResult, TurnInfo, TurnStatus } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { type Call, outsideOrigins } from '@sand/orchestrator/contract'
import { lazy } from '@sand/util'
import { service } from 'drydock'
import { z } from 'zod'

export interface BotTurns {
  send(bot: string, input: SendInput): Promise<SendResult>
  ended(turn: string, signal?: AbortSignal): Promise<TurnInfo>
  follow(bot: string, sent: SendResult, signal?: AbortSignal): Promise<TurnInfo | undefined>
  final(bot: string, turn: string): string | undefined
}

export const botTurns = service<BotTurns>('botTurns')

export interface BotAnswer {
  bot: string
  turn?: string
  status: TurnStatus | 'queued'
  reply?: string
  error?: string
  reported?: true
}

export const waitLimit = 25_000

export interface BotSnapshot extends EntryPage {
  live: LiveBlock[]
  pending: PendingItem[]
}

const one = lazy(() => z.object({ bot: z.string() }))

export const botStreamWire = wireEvent<[bot: string, event: LiveEvent]>('bot.stream')
export const botPendingWire = wireEvent<[bot: string, pending: PendingItem[]]>('bot.pending')

export const botSend = request('bot.send', {
  input: () => one().extend({ prompt: promptInput(), origin: z.enum(outsideOrigins).optional(), clientRequestId: z.string().min(1) }),
  output: type<BotAnswer>(),
  callers: 'any',
})
export const botAwait = request('bot.await', {
  input: () => one().extend({ turn: z.string(), timeoutMs: z.number().int().min(0).max(waitLimit).optional() }),
  output: type<BotAnswer>(),
  callers: 'any',
})
export const botInterrupt = request('bot.interrupt', { input: one, output: type<boolean>() })
export const botOpen = request('bot.open', {
  input: () =>
    one().extend({
      before: z.number().int().optional(),
      after: z.number().int().min(0).optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }),
  output: type<BotSnapshot>(),
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

