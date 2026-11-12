import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export const botKind = 'bot'

export const botReplyEntry = 'bot-reply'

export interface BotReplyEntry {
  bot: string
  turn?: string
}

export const botSubagents = request('bot.subagents', { input: () => z.object({}), output: type<Record<string, string>>() })

export const botSubagentWire = wireEvent<[subagent: string, bot: string]>('bot.subagent')
