import type { ConversationRef, Owner, SendResult } from '@sand/engine/contract'
import { type Notice, orchestrator, reportOf } from '@sand/orchestrator/contract'
import type { BotAnswer } from '../contract'
import { type Ask, type Asking, sentAnswer } from './ask'
import type { BotsMcpContext } from './context'

const schema = [
  [
    `create table if not exists bot_replies (
      bot text not null,
      request text not null,
      sent text not null,
      sender text not null,
      at integer not null,
      sender_owner text not null default 'bot',
      primary key (bot, request)
    )`,
  ],
]

interface Asked {
  bot: string
  request: string
  sent: string
  sender: string
  sender_owner: Owner
}

export const createReplies = (ctx: BotsMcpContext, ask: Ask) => {
  ctx.ledger.migrate('bots-mcp', schema)
  const { db } = ctx.ledger
  const all = db.query<Asked, []>('select bot, request, sent, sender, sender_owner from bot_replies')
  const written = db.query('insert or ignore into bot_replies (bot, request, sent, sender, sender_owner, at) values ($bot, $request, $sent, $sender, $sender_owner, $at)')
  const removed = db.query('delete from bot_replies where bot = $bot and request = $request')
  const unloaded = new AbortController()
  ctx.effect(() => () => unloaded.abort())

  const deliver = async (to: ConversationRef, { text, clientRequestId }: Notice) => {
    if (to.owner !== 'bot') return ctx.get(orchestrator)?.deliver(to, { text, clientRequestId })
    if (ctx.bots.get(to.id)) await ctx.botTurns.send(to.id, { prompt: text, origin: 'job', clientRequestId })
  }

  const report = async ({ bot, request, sent, sender, sender_owner }: Asked) => {
    const given: SendResult = JSON.parse(sent)
    const info = ctx.bots.get(bot) && (await ctx.botTurns.follow(bot, given, unloaded.signal))
    if (unloaded.signal.aborted) return
    if (info) {
      const result = info.error ?? ctx.botTurns.final(bot, info.id) ?? ''
      const text = reportOf({ from: { owner: 'bot', id: bot }, label: ctx.bots.get(bot)?.name || 'A bot', status: info.status, at: info.ended ?? Date.now(), result })
      await deliver({ owner: sender_owner, id: sender }, { text, clientRequestId: `${bot}@${info.id}` })
    }
    removed.run({ bot, request })
  }

  const follow = (asked: Asked) => void report(asked).catch(error => ctx.report(error))

  for (const asked of all.all()) follow(asked)

  return {
    async ask(bot: string, asking: Asking, { owner, id }: ConversationRef): Promise<BotAnswer> {
      const sent = await ask.send(bot, asking)
      const asked = { bot, request: asking.clientRequestId, sent: JSON.stringify(sent), sender: id, sender_owner: owner }
      if (written.run({ ...asked, at: Date.now() }).changes) follow(asked)
      return { ...sentAnswer(bot, sent), reported: true }
    },
  }
}

export type Replies = ReturnType<typeof createReplies>
