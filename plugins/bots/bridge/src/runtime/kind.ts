import type { BotSummary, Bots } from '@sand/bots/contract'
import type { ContextKind, Reader } from '@sand/context/contract'
import { botKind } from '../contract'

const mentioned = (bot: BotSummary) =>
  `${named(bot)} The user also sent this message to it, and it answers here itself in a bot-reply. Don't answer for it or redo its work. Reply only to what in the message is for you; if nothing is, end your turn without writing anything.`

const named = ({ id, name }: BotSummary) => `The user's bot "${name}" (id ${id}).`

const sentBy = ({ id, name }: BotSummary, to: Reader) => {
  const from = `This message is from the user's bot "${name}" (id ${id}), not from the user. Do what it asks as you would for the user.`
  if (to.kind === 'agent') return from
  return `${from} Your reply stays in this chat; if it asks to hear back, message it with bot_send.`
}

export const botContext = (bots: Bots): ContextKind => ({
  kind: botKind,
  title: 'Bot',
  project({ data }, to) {
    const bot = typeof data.id === 'string' ? bots.get(data.id) : undefined
    if (!bot) return { unavailable: 'This bot was deleted.' }
    if (data.sent) return { body: sentBy(bot, to) }
    return { body: to.kind === 'bot' ? named(bot) : mentioned(bot) }
  },
})
