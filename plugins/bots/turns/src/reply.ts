import type { Bots } from '@sand/bots/contract'
import { type Message, textOf } from '@sand/chats/contract'
import type { Engine } from '@sand/engine/contract'

export const finalReply = (bots: Bots, engine: Engine) => (bot: string, turn: string) => {
  if (engine.turn('bot', turn)?.ended === undefined) return undefined
  const last = bots
    .conversation(bot)
    .entries()
    .findLast(entry => entry.turn === turn && entry.type === 'message')
  const message = last?.data as Message | undefined
  return message?.role === 'assistant' ? textOf(message.content).trim() : ''
}
