import type { Bots } from '@sand/bots/contract'
import type { Prompt } from '@sand/chats/contract'
import type { SendResult, TurnInfo, TurnOrigin } from '@sand/engine/contract'
import type { Actor } from '@sand/host-hub/contract'
import { failure, orchestrator, originOf } from '@sand/orchestrator/contract'
import type { Context } from 'drydock'
import type { BotAnswer, BotTurns } from './contract'

export interface Asking {
  bot: string
  prompt: Prompt
  origin?: TurnOrigin
  clientRequestId: string
}

const outside = 'This message is from an outside agent, not from the user. Your reply goes back to it.'

const introduced = (text: string, prompt: Prompt): Prompt => (typeof prompt === 'string' ? `${text}\n\n${prompt}` : [{ type: 'text', text }, ...prompt])

const sentAnswer = (bot: string, sent: SendResult): BotAnswer => (sent.turn ? { bot, turn: sent.turn, status: 'running' } : { bot, status: 'queued' })

export const createAsks = (ctx: Context, bots: Bots, turns: BotTurns) => {
  const signed = (prompt: Prompt, actor: Actor | undefined, origin: TurnOrigin | undefined): Prompt => {
    if (actor) return ctx.get(orchestrator)?.sign(prompt, actor) ?? prompt
    return origin ? introduced(outside, prompt) : prompt
  }

  const answerOf = (bot: string, info: TurnInfo): BotAnswer => {
    const reply = turns.final(bot, info.id)
    return { bot, turn: info.id, status: info.status, ...(reply && { reply }), ...(info.error && { error: info.error }) }
  }

  return {
    async send({ bot, prompt, origin, clientRequestId }: Asking, actor: Actor | undefined): Promise<BotAnswer> {
      if (actor?.owner === 'bot' && actor.id === bot) throw failure('invalid_request', "A bot can't message itself")
      if (!bots.get(bot)) throw failure('not_found', `No bot ${bot}`)
      const sent = await turns.send(bot, { prompt: signed(prompt, actor, origin), origin: originOf(actor, origin ?? 'user'), clientRequestId })
      const answer = sentAnswer(bot, sent)
      return actor ? { ...answer, detached: true } : answer
    },
    async wait(bot: string, turn: string, signal: AbortSignal): Promise<BotAnswer> {
      const info = await turns.ended(turn, signal)
      if (info.conversation !== bot) throw failure('not_found', `No turn ${turn} of bot ${bot}`)
      return answerOf(bot, info)
    },
  }
}
