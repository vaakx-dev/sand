import type { Bots } from '@sand/bots/contract'
import { type Prompt, sessions } from '@sand/chats/contract'
import type { Owner, SendResult, TurnInfo, TurnOrigin } from '@sand/engine/contract'
import type { Actor } from '@sand/host-hub/contract'
import type { Ledger } from '@sand/ledger/contract'
import { failure, orchestrator, originOf, reportOf } from '@sand/orchestrator/contract'
import type { Context } from 'drydock'
import type { BotAnswer, BotTurns } from './contract'

export interface Asking {
  bot: string
  prompt: Prompt
  origin?: TurnOrigin
  clientRequestId: string
}

interface Asked {
  bot: string
  request: string
  sent: string
  sender: string
  sender_owner: Owner
}

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

const outside = 'This message is from an outside agent, not from the user. Your reply goes back to it.'

const intro: Record<Actor['owner'], (label: string) => string> = {
  bot: label => `This message is from ${label}, another of the user's bots, not from the user. Your reply goes back to it.`,
  thread: label => `This message is from the agent working in the user's thread "${label}", not from the user. Your reply goes back to it.`,
}

const introduced = (text: string, prompt: Prompt): Prompt => (typeof prompt === 'string' ? `${text}\n\n${prompt}` : [{ type: 'text', text }, ...prompt])

const sentAnswer = (bot: string, sent: SendResult): BotAnswer => (sent.turn ? { bot, turn: sent.turn, status: 'running' } : { bot, status: 'queued' })

export const createAsks = (ctx: Context, bots: Bots, turns: BotTurns, ledger: Ledger) => {
  ledger.migrate('bot-asks', schema)
  const { db } = ledger
  const all = db.query<Asked, []>('select bot, request, sent, sender, sender_owner from bot_replies')
  const written = db.query('insert or ignore into bot_replies (bot, request, sent, sender, sender_owner, at) values ($bot, $request, $sent, $sender, $sender_owner, $at)')
  const removed = db.query('delete from bot_replies where bot = $bot and request = $request')
  const unloaded = new AbortController()
  ctx.effect(() => () => unloaded.abort())

  const labelOf = ({ owner, id }: Actor) => (owner === 'bot' ? bots.get(id)?.name || 'a bot' : ctx.get(sessions)?.open(id)?.title || 'a thread')

  const signed = (prompt: Prompt, actor: Actor | undefined, origin: TurnOrigin | undefined): Prompt => {
    if (actor) return ctx.get(orchestrator)?.sign(introduced(intro[actor.owner](labelOf(actor)), prompt), actor) ?? prompt
    return origin ? introduced(outside, prompt) : prompt
  }

  const answerOf = (bot: string, info: TurnInfo): BotAnswer => {
    const reply = turns.final(bot, info.id)
    return { bot, turn: info.id, status: info.status, ...(reply && { reply }), ...(info.error && { error: info.error }) }
  }

  const report = async ({ bot, request, sent, sender, sender_owner }: Asked) => {
    const given: SendResult = JSON.parse(sent)
    const info = bots.get(bot) && (await turns.follow(bot, given, unloaded.signal))
    if (unloaded.signal.aborted) return
    if (info) {
      const result = info.error ?? turns.final(bot, info.id) ?? ''
      const text = reportOf({ from: { owner: 'bot', id: bot }, label: bots.get(bot)?.name || 'A bot', status: info.status, at: info.ended ?? Date.now(), result })
      await ctx.get(orchestrator)?.deliver({ owner: sender_owner, id: sender }, { text, clientRequestId: `${bot}@${info.id}` })
    }
    removed.run({ bot, request })
  }

  const follow = (asked: Asked) => void report(asked).catch(error => ctx.report(error))

  const reported = (bot: string, clientRequestId: string, sent: SendResult, { owner, id }: Actor): BotAnswer => {
    const asked = { bot, request: clientRequestId, sent: JSON.stringify(sent), sender: id, sender_owner: owner }
    if (written.run({ ...asked, at: Date.now() }).changes) follow(asked)
    return { ...sentAnswer(bot, sent), reported: true }
  }

  for (const asked of all.all()) follow(asked)

  return {
    async send({ bot, prompt, origin, clientRequestId }: Asking, actor: Actor | undefined): Promise<BotAnswer> {
      if (actor?.owner === 'bot' && actor.id === bot) throw failure('invalid_request', "A bot can't message itself")
      if (!bots.get(bot)) throw failure('not_found', `No bot ${bot}`)
      const sent = await turns.send(bot, { prompt: signed(prompt, actor, origin), origin: originOf(actor, origin ?? 'user'), clientRequestId })
      return actor ? reported(bot, clientRequestId, sent, actor) : sentAnswer(bot, sent)
    },
    async wait(bot: string, turn: string, signal: AbortSignal): Promise<BotAnswer> {
      const info = await turns.ended(turn, signal)
      if (info.conversation !== bot) throw failure('not_found', `No turn ${turn} of bot ${bot}`)
      return answerOf(bot, info)
    },
  }
}
