import { type ContextRecord, type Entry, linkLabels, type Message, promptText, type Session } from '@sand/chats/contract'
import { botKind, botReplyEntry, type BotReplyEntry } from '../contract'
import type { Ask } from './ask'
import type { BridgeContext } from './context'

const mentionedBot = ({ kind, data }: ContextRecord) => (kind === botKind && !data.sent && typeof data.id === 'string' ? data.id : undefined)

const recordsIn = (message: Message) => message.content.flatMap(block => (block.type === 'context' ? block.records : []))

const botsIn = (message: Message) => [...new Set(recordsIn(message).flatMap(record => mentionedBot(record) ?? []))]

const promptOf = (session: Session, message: Message) =>
  `The user wrote this to you from their thread${session.title ? ` "${session.title}"` : ''}; your reply shows there.\n\n${linkLabels(promptText(message, '\n\n'))}`

export const routeMentions = (ctx: BridgeContext, ask: Ask) => (session: Session, entry: Entry) => {
  const message = entry.type === 'message' ? (entry.data as Message) : undefined
  if (message?.role !== 'user') return
  const bots = botsIn(message).filter(bot => ctx.bots.get(bot))
  for (const bot of bots)
    ask
      .ask(bot, { prompt: promptOf(session, message), origin: 'user', clientRequestId: `${entry.id}:${bot}` })
      .then(({ turn }) => void session.append(botReplyEntry, { bot, ...(turn && { turn }) } satisfies BotReplyEntry))
      .catch(error => ctx.report(error))
}
