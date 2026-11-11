import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export const botKind = 'bot'

export const botReplyEntry = 'bot-reply'

export interface BotReplyEntry {
  bot: string
  turn?: string
}

export const botStarts = request('bot.starts', { input: () => z.object({}), output: type<Record<string, string>>() })

export const botStartedWire = wireEvent<[thread: string, bot: string]>('bot.started')
