import type { Bots } from '@sand/bots/contract'
import type { EntryView } from '@sand/engine/contract'
import { botReplyEntry, type BotReplyEntry } from '../contract'
import type { Ask } from './ask'

const said = (name: string, reply: string | undefined) => {
  if (reply === undefined) return `${name} hadn't replied yet; bot_read shows its reply.`
  return reply ? `${name} replied to the user:\n\n${reply}` : `${name} gave no reply.`
}

export const replyView = (bots: Bots, ask: Ask): EntryView => ({
  type: botReplyEntry,
  message(entry) {
    const { bot, turn } = entry.data as BotReplyEntry
    const name = bots.get(bot)?.name || 'The bot'
    const text = `<bot-reply bot="${bot}">\n${said(name, turn && ask.final(bot, turn))}\n</bot-reply>`
    return { role: 'user', content: [{ type: 'text', text }] }
  },
})
