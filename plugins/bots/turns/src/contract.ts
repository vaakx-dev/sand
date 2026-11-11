import type { LiveBlock, LiveEvent } from '@sand/accounts/contract'
import type { EntryPage } from '@sand/bots/contract'
import { promptInput } from '@sand/chats/contract'
import type { PendingItem, SendInput, SendResult, TurnInfo } from '@sand/engine/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export interface BotTurns {
  send(bot: string, input: SendInput): Promise<SendResult>
  ended(turn: string, signal?: AbortSignal): Promise<TurnInfo>
  follow(bot: string, sent: SendResult, signal?: AbortSignal): Promise<TurnInfo | undefined>
  final(bot: string, turn: string): string | undefined
}

export const botTurns = service<BotTurns>('botTurns')

export interface BotSnapshot extends EntryPage {
  live: LiveBlock[]
  pending: PendingItem[]
}

const one = z.object({ bot: z.string() })

export const botStreamWire = wireEvent<[bot: string, event: LiveEvent]>('bot.stream')
export const botPendingWire = wireEvent<[bot: string, pending: PendingItem[]]>('bot.pending')

export const botSend = request('bot.send', { input: one.extend({ prompt: promptInput, clientRequestId: z.string() }), output: type<SendResult>() })
export const botInterrupt = request('bot.interrupt', { input: one, output: type<boolean>() })
export const botOpen = request('bot.open', { input: one.extend({ after: z.number().int().min(0).optional() }), output: type<BotSnapshot>() })

