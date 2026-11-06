import { type BotEntry, shownText } from '@sand/bots/contract'
import { type Message, type Prompt, textOf } from '@sand/chats/contract'
import type { TurnInfo, TurnOrigin } from '@sand/engine/contract'
import type { BotAnswer, BotItem, BotPage } from '../contract'
import type { BridgeContext } from './context'

export interface Asking {
  prompt: Prompt
  origin: TurnOrigin
  clientRequestId: string
}

export interface ReadOptions {
  after?: number
  limit?: number
}

const defaultLimit = 50

const messageOf = (entry: BotEntry) => (entry.type === 'message' ? (entry.data as Message) : undefined)

const itemOf = (entry: BotEntry): BotItem[] => {
  const message = messageOf(entry)
  const text = message && shownText(message).trim()
  return message && text ? [{ seq: entry.seq, at: entry.at, role: message.role, text, ...(entry.turn && { turn: entry.turn }) }] : []
}

export const createAsk = (ctx: BridgeContext) => {
  const known = (bot: string) => {
    if (!ctx.bots.get(bot)) throw new Error(`No bot ${bot}`)
    return bot
  }

  const replyOf = (bot: string, turn: string) => {
    const last = ctx.bots
      .conversation(bot)
      .entries()
      .findLast(entry => entry.turn === turn && entry.type === 'message')
    const message = last && messageOf(last)
    return message?.role === 'assistant' ? textOf(message.content).trim() || undefined : undefined
  }

  const answerOf = (bot: string, info: TurnInfo): BotAnswer => {
    const reply = replyOf(bot, info.id)
    return { bot, turn: info.id, status: info.status, ...(reply && { reply }), ...(info.error && { error: info.error }) }
  }

  return {
    final(bot: string, turn: string) {
      return ctx.engine.turn('bot', turn)?.ended === undefined ? undefined : (replyOf(bot, turn) ?? '')
    },
    async ask(bot: string, asking: Asking): Promise<BotAnswer> {
      const sent = await ctx.botTurns.send(known(bot), asking)
      return sent.turn ? { bot, turn: sent.turn, status: 'running' } : { bot, status: 'queued' }
    },
    async wait(answer: BotAnswer, signal: AbortSignal): Promise<BotAnswer> {
      if (!answer.turn) return answer
      const info = await ctx.botTurns.ended(answer.turn, signal)
      if (info.conversation !== answer.bot) throw new Error(`No turn ${answer.turn} of bot ${answer.bot}`)
      return answerOf(answer.bot, info)
    },
    read(bot: string, { after, limit = defaultLimit }: ReadOptions): BotPage {
      const all = ctx.bots.conversation(known(bot)).entries().flatMap(itemOf)
      const later = after === undefined ? all : all.filter(item => item.seq > after)
      const items = after === undefined ? later.slice(-limit) : later.slice(0, limit)
      return { bot, items, next: items.at(-1)?.seq ?? after ?? 0, more: after !== undefined && later.length > items.length }
    },
  }
}

export type Ask = ReturnType<typeof createAsk>
