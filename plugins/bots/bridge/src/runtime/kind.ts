import type { BotSummary, Bots } from '@sand/bots/contract'
import type { ContextKind } from '@sand/context/contract'
import { botKind } from '../contract'

const mentioned = ({ id, name }: BotSummary) =>
  `The user's bot "${name}" (id ${id}). The user handed this message to it, and it answers in this thread itself; its reply follows as a bot-reply. Don't answer for it or redo its work. Reply only to what in the message is for you; if nothing is, end your turn without writing anything.`

const sentBy = ({ id, name }: BotSummary) =>
  `This message is from the user's bot "${name}" (id ${id}), not from the user. Do what it asks as you would for the user. If it started this thread, your final reply reaches it when you finish; otherwise answer it with bot_send.`

export const botContext = (bots: Bots): ContextKind => ({
  kind: botKind,
  title: 'Bot',
  project({ data }) {
    const bot = typeof data.id === 'string' ? bots.get(data.id) : undefined
    if (!bot) return { unavailable: 'This bot was deleted.' }
    return { body: data.sent ? sentBy(bot) : mentioned(bot) }
  },
})
