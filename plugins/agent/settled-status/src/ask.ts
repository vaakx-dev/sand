import { type Message, promptText, type Session, textOf } from '@sand/chats/contract'
import type { PullLinks } from '@sand/pull-links/contract'
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

const pullLines = async (session: Session, links: PullLinks | undefined) => {
  const pulls = await links?.links(session.id)
  return (pulls?.links ?? []).map(({ number, summary }) => (summary ? `#${number} ${summary.state}: ${summary.title}` : `#${number}`))
}

const tail = async (session: Session, links: PullLinks | undefined) => {
  const messages = session.messages()
  const ask = lastText(messages, message => (message.role === 'user' ? promptText(message) : ''))
  const reply = lastText(messages, message => (message.role === 'assistant' ? textOf(message.content) : ''))
  const pulls = await pullLines(session, links)
  return [
    `Thread title: ${session.title}`,
    ask && `Last ask:\n${ask.slice(0, mostChars)}`,
    reply && `Last reply:\n${reply.slice(-mostChars)}`,
    pulls.length && `Pull requests:\n${pulls.join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const askStatus = async (sub: SubModel, session: Session, links: PullLinks | undefined) => {
  const prompt = await tail(session, links)
  const text = await sub.text({ job: statusJob.id, tier: 'fast', system, prompt, cwd: session.cwd, session: session.id })
  return oneLine(text)
}
