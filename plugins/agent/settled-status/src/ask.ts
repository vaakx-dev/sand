import { type Message, promptText, type Session, textOf } from '@sand/chats/contract'
import type { SubModel } from '@sand/sub-model/contract'
import { oneLine } from '@sand/util'

export const statusJob = { id: 'settled-status', label: 'Settled status' }

const mostChars = 1500

const system = `A developer has settled a thread with a coding agent. Write one line, under 70 characters, on where it ended: the outcome first, then the detail that matters, such as "merged in #544, sprites draw one frame" or "dropped, the API has no batch endpoint". Lowercase, no quotes, no closing period. Reply with the line only.`

const lastText = (messages: Message[], read: (message: Message) => string) => {
  for (const message of messages.toReversed()) {
    const text = read(message).trim()
    if (text) return text
  }
  return ''
}

const tail = (session: Session) => {
  const messages = session.messages()
  const ask = lastText(messages, message => (message.role === 'user' ? promptText(message) : ''))
  const reply = lastText(messages, message => (message.role === 'assistant' ? textOf(message.content) : ''))
  return [
    `Thread title: ${session.title}`,
    ask && `Last ask:\n${ask.slice(0, mostChars)}`,
    reply && `Last reply:\n${reply.slice(-mostChars)}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const askStatus = async (sub: SubModel, session: Session) => {
  const text = await sub.text({ job: statusJob.id, tier: 'fast', system, prompt: tail(session), cwd: session.cwd, session: session.id })
  return oneLine(text)
}
