import { type Message, textOf } from '@sand/chats/contract'
import type { SubModel } from '@sand/sub-model/contract'
import { oneLine } from '@sand/util'
import { z } from 'zod'

const mostReplyChars = 6000
const mostGistChars = 80

const system = `You sum up what an assistant bot just reported. Given its latest reply, write one short line, under 60 characters, that says what happened or what it found, such as "Deployed the site, all checks pass" or "Asked which date to book". Plain words, sentence case, no quotes, no trailing period. Reply as JSON: {"gist": "..."}.`

const summed = z.object({ gist: z.string() })

const cleaned = (gist: string) => oneLine(gist.replace(/^[\s"'`]+|[\s"'`.]+$/g, ''), mostGistChars)

export const askGist = async (sub: SubModel, { bot, reply, signal }: { bot: string; reply: Message; signal: AbortSignal }) => {
  const prompt = textOf(reply.content, '\n').slice(0, mostReplyChars)
  const answer = await sub.json({ tier: 'fast', system, prompt, session: bot, signal }, summed)
  const gist = cleaned(answer.gist)
  if (!gist) throw new Error('the model sent an empty gist')
  return gist
}
