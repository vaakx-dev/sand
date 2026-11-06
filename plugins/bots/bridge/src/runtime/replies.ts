import type { ConversationRef, Owner, SendResult } from '@sand/engine/contract'
import { reportOf } from '@sand/orchestrator/contract'
import type { BotAnswer } from '../contract'
import { type Ask, type Asking, sentAnswer } from './ask'
import type { BridgeContext } from './context'

const schema = [
  ['create table bot_threads (thread text primary key, bot text not null, at integer not null)'],
  [
    'drop table bot_threads',
    'create table bot_replies (bot text not null, request text not null, sent text not null, sender text not null, at integer not null, primary key (bot, request))',
  ],
  ["alter table bot_replies add column sender_owner text not null default 'bot'"],
]

interface Asked {
  bot: string
  request: string
  sent: string
  sender: string
  sender_owner: Owner
}

export const createReplies = (ctx: BridgeContext, ask: Ask) => {
  ctx.ledger.migrate('bot-bridge', schema)
  const { db } = ctx.ledger
  const all = db.query<Asked, []>('select bot, request, sent, sender, sender_owner from bot_replies')
  const written = db.query('insert or ignore into bot_replies (bot, request, sent, sender, sender_owner, at) values ($bot, $request, $sent, $sender, $sender_owner, $at)')
  const removed = db.query('delete from bot_replies where bot = $bot and request = $request')
  const unloaded = new AbortController()
  ctx.effect(() => () => unloaded.abort())

  const report = async ({ bot, request, sent, sender, sender_owner }: Asked) => {
    const given: SendResult = JSON.parse(sent)
    const info = ctx.bots.get(bot) && (await ctx.botTurns.follow(bot, given, unloaded.signal))
    if (unloaded.signal.aborted) return
    if (info) {
      const result = info.error ?? ask.final(bot, info.id) ?? ''
      const text = reportOf({ from: { owner: 'bot', id: bot }, label: ctx.bots.get(bot)?.name ?? 'A bot', status: info.status, result })
      await ctx.orchestrator.deliver({ owner: sender_owner, id: sender }, { text, clientRequestId: `${bot}@${info.id}` })
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
