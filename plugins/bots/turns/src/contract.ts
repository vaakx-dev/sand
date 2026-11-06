import type { LiveBlock, LiveEvent } from '@sand/accounts/contract'
import { promptInput } from '@sand/chats/contract'
import type { BotSummary } from '@sand/bots/contract'
import type { SendInput, SendResult, TurnInfo } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export interface BotTurns {
  send(bot: string, input: SendInput): Promise<SendResult>
  ended(turn: string, signal?: AbortSignal): Promise<TurnInfo>
  follow(bot: string, sent: SendResult, signal?: AbortSignal): Promise<TurnInfo | undefined>
}

export const botTurns = service<BotTurns>('botTurns')

const one = z.object({ bot: z.string() })

export const botStreamWire = wireEvent<[bot: string, event: LiveEvent]>('bot.stream')

export const botSend = request('bot.send', { input: one.extend({ prompt: promptInput, clientRequestId: z.string() }), output: type<SendResult>() })
export const botInterrupt = request('bot.interrupt', { input: one, output: type<boolean>() })
export const botLive = request('bot.live', { input: one, output: type<LiveBlock[]>() })

export const jobLimit = 2_000

export const botSetJob = request('bot.set-job', {
  input: z.object({ job: z.string().trim().min(1).max(jobLimit), name: z.string().trim().min(1).max(60).optional() }),
  output: type<Pick<BotSummary, 'name' | 'job'>>(),
  callers: 'any',
})
