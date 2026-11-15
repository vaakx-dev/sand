import { type Message, type Session, textOf } from '@sand/chats/contract'

export const finalReply = (session: Session, turn: string) => {
  const last = session.path().findLast(entry => entry.turn === turn && entry.type === 'message')
  const message = last?.data as Message | undefined
  return message?.role === 'assistant' ? textOf(message.content).trim() : ''
}
