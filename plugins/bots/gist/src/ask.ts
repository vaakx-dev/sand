import { type Message, textOf } from '@sand/chats/contract'
import type { Ask } from '@sand/ask/contract'
import { oneLine } from '@sand/util'
import { z } from 'zod'

const mostReplyChars = 6000
const mostGistChars = 80

const system = `You sum up what an assistant bot just reported. Given its latest reply, write one short line, under 60 characters, that says what happened or what it found, such as "Deployed the site, all checks pass" or "Asked which date to book". Plain words, sentence case, no quotes, no trailing period. Reply as JSON: {"gist": "..."}.

The prompt may start with a note in square brackets saying agents the bot started are still working. Then the bot is waiting on them: if the line says what it waits on, it waits on its agent, such as "Waiting on its agent to finish the change", never on the user, unless the reply asks the user a question.`

const summed = z.object({ gist: z.string() })

const cleaned = (gist: string) => oneLine(gist.replace(/^[\s"'`]+|[\s"'`.]+$/g, ''), mostGistChars)

const agentsNote = (agents: number) =>
  agents ? `[${agents === 1 ? 'An agent the bot started is' : `${agents} agents the bot started are`} still working.]\n\n` : ''

interface GistInput {
  bot: string
  reply: Message
  agents: number
  signal: AbortSignal
}

export const askGist = async (ask: Ask, { bot, reply, agents, signal }: GistInput) => {
  const prompt = agentsNote(agents) + textOf(reply.content, '\n').slice(0, mostReplyChars)
  const answer = await ask.json({ use: 'text', system, prompt, session: bot, signal }, summed)
  const gist = cleaned(answer.gist)
  if (!gist) throw new Error('the model sent an empty gist')
  return gist
}
