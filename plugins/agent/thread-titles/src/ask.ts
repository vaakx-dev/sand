import { type Message, type Session, type UserPart, userParts } from '@sand/chats/contract'
import type { SubModel } from '@sand/sub-model/contract'
import { oneLine } from '@sand/util'
import { z } from 'zod'

const mostPromptChars = 4000
const mostTitleChars = 60

const system = `You title chat threads. Given the first message a developer sent to a coding agent, reply with a title of 3 to 6 words, under 40 characters, that says what the thread is about, such as "Fix snooze wake time" or "Search in the files panel". Sentence case, no quotes, no trailing period. Reply as JSON: {"title": "..."}.`

const titled = z.object({ title: z.string() })

export const titleJob = { id: 'thread-title', label: 'Thread titles' }

const partLine = (part: UserPart) => {
  if (part.kind === 'text') return part.text
  if (part.kind === 'skill') return `[skill: ${part.name}]`
  if (part.kind === 'feedback') return part.feedback.text
  return `[attached ${part.kind}: ${part.block.name ?? 'unnamed'}]`
}

const messageText = (message: Message) => userParts(message).map(partLine).join('\n').slice(0, mostPromptChars)

const cleaned = (title: string) => oneLine(title.replace(/^[\s"'`]+|[\s"'`.]+$/g, ''), mostTitleChars)

export const askTitle = async (sub: SubModel, session: Session, message: Message, signal: AbortSignal) => {
  const reply = await sub.json(
    { job: titleJob.id, tier: 'fast', system, prompt: messageText(message), cwd: session.cwd, session: session.id, signal },
    titled,
  )
  const title = cleaned(reply.title)
  if (!title) throw new Error('the model sent an empty title')
  return title
}
