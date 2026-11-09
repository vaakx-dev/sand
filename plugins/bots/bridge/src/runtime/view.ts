import type { BotTurns } from '@sand/bot-turns/contract'
import type { Bots } from '@sand/bots/contract'
import type { EntryView } from '@sand/engine/contract'
import { botReplyEntry, type BotReplyEntry } from '../contract'

const said = (name: string, reply: string | undefined) => {
  if (reply === undefined) return `${name} hadn't replied yet; history_read with its bot id shows its reply.`
  return reply ? `${name} replied to the user:\n\n${reply}` : `${name} gave no reply.`
}

export const replyView = (bots: Bots, turns: BotTurns): EntryView => ({
  type: botReplyEntry,
  message(entry) {
    const { bot, turn } = entry.data as BotReplyEntry
    const name = bots.get(bot)?.name || 'The bot'
    const text = `<bot-reply bot="${bot}">\n${said(name, turn && turns.final(bot, turn))}\n</bot-reply>`
    return { role: 'user', content: [{ type: 'text', text }] }
  },
})
