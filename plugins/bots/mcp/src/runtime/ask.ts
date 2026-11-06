import type { BotEntry } from '@sand/bots/contract'
import { type Message, type Prompt, textOf } from '@sand/chats/contract'
import type { SendResult, TurnInfo, TurnOrigin } from '@sand/engine/contract'
import type { BotAnswer, BotItem, BotPage } from '../contract'
import type { BotsMcpContext } from './context'

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

export const sentAnswer = (bot: string, sent: SendResult): BotAnswer => (sent.turn ? { bot, turn: sent.turn, status: 'running' } : { bot, status: 'queued' })

const itemOf = (entry: BotEntry): BotItem[] => {
  const message = entry.type === 'message' ? (entry.data as Message) : undefined
  const text = message && textOf(message.content).trim()
  return message && text ? [{ seq: entry.seq, at: entry.at, role: message.role, text, ...(entry.turn && { turn: entry.turn }) }] : []
}

export const createAsk = (ctx: BotsMcpContext) => {
  const known = (bot: string) => {
    if (!ctx.bots.get(bot)) throw new Error(`No bot ${bot}`)
    return bot
  }

  const answerOf = (bot: string, info: TurnInfo): BotAnswer => {
    const reply = ctx.botTurns.final(bot, info.id)
    return { bot, turn: info.id, status: info.status, ...(reply && { reply }), ...(info.error && { error: info.error }) }
  }

  return {
    send: (bot: string, asking: Asking) => ctx.botTurns.send(known(bot), asking),
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
