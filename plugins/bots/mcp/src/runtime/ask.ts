import type { Prompt } from '@sand/chats/contract'
import type { SendResult, TurnInfo, TurnOrigin } from '@sand/engine/contract'
import type { BotAnswer } from '../contract'
import type { BotsMcpContext } from './context'

export interface Asking {
  prompt: Prompt
  origin: TurnOrigin
  clientRequestId: string
}

export const sentAnswer = (bot: string, sent: SendResult): BotAnswer => (sent.turn ? { bot, turn: sent.turn, status: 'running' } : { bot, status: 'queued' })

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
  }
}

export type Ask = ReturnType<typeof createAsk>
