import type { ConversationRef } from '@sand/engine/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { answerEntry, type AskAnswer, type Login, secretEntry, type SecretRequest } from '../contract'
import { onceLife } from '../service'
import { siteOf } from '../site'
import type { SecretAnswer, Unanswered } from '../waits'
import { group, type ToolDeps } from './deps'

const answerTimeout = 20 * 60_000
const settleGrace = 30_000

const input = z.object({
  title: z.string().trim().min(1).max(100).describe("Card title, which also names the saved login, such as 'GitHub token' or 'Northbank'"),
  reason: z.string().trim().min(1).max(1000).describe('What it is for and where the user gets it'),
  placeholder: z.string().trim().min(1).max(100).optional().describe('Hint shown in the empty field, such as ghp_…'),
  site: z.string().trim().min(1).max(253).optional().describe('For a website login, its domain, such as bank.com: the card then asks for a username and password'),
  once: z
    .boolean()
    .describe(
      'True for a value needed only once, such as a code sent by email or text or a single-use token: it is held for one use and never saved, unless the user chooses to. False for one worth keeping, such as a password or API key: it is saved as a login.',
    ),
})

const description =
  'Ask the user for a secret in a private card and wait until they answer: an API key or token, or with site a website login (username and password). Use this instead of asking for a secret in chat; you never see the value. It becomes one of the logins, saved or for one use only: pass a key to Shell with its logins parameter, or fill a website login into the browser with login_fill.'

const unanswered: Record<Unanswered, string> = {
  declined: 'The user declined. Go on without it, or ask what to do instead.',
  timed_out: 'The user did not answer within 20 minutes. Call request_secret again if you still need it.',
  cancelled: 'Cancelled before the user answered.',
}

const howTo = ({ id, kind }: Login) =>
  kind === 'website'
    ? `Fill it into the sign-in page with login_fill { login: "${id}" }.`
    : `Pass it to a Shell command as an environment variable with its logins parameter, e.g. logins: { "API_TOKEN": "${id}" }, and never print it.`

const kept = (login: Login, save: boolean) =>
  save
    ? `Saved as login ${login.id}.`
    : `Held as one-time login ${login.id}: it works for one use in the next ${onceLife / 60_000} minutes, then it is gone. It is not saved.`

const accessFor = ({ logins }: ToolDeps, conversation: ConversationRef) => {
  const { bot } = logins.responsible(conversation)
  return bot ? { bots: [bot], threads: [] } : { bots: [], threads: [conversation.id] }
}

const newLogin = (name: string, site: string | undefined, answer: SecretAnswer) => {
  if (site && 'username' in answer) return { kind: 'website' as const, name, site, username: answer.username, password: answer.password }
  if (!site && 'value' in answer) return { kind: 'key' as const, name, value: answer.value }
  throw new Error('The card sent the wrong kind of answer; call request_secret again.')
}

export const secretTool = (deps: ToolDeps): Tool<typeof input> => ({
  name: 'request_secret',
  group,
  description,
  input,
  effect: 'read',
  active: conversation => conversation.owner !== 'thread' || deps.sessions.require(conversation.id).kind !== 'agent',
  timeoutMs: answerTimeout + settleGrace,
  async run({ title, reason, placeholder, site: given, once }, context) {
    const { conversation, signal } = context
    const site = given && siteOf(given)
    const id = Bun.randomUUIDv7()
    conversation.append(secretEntry, { id, title, reason, ...(placeholder && { placeholder }), ...(site && { site }), ...(once && { once }) } satisfies SecretRequest)
    const done = context.wait({ kind: 'secret', call: context.call.id, title })
    const outcome = await deps.secrets.wait(conversation.id, id, answerTimeout, signal).finally(done)
    if (outcome.status !== 'answered') {
      conversation.append(answerEntry, { id, status: outcome.status } satisfies AskAnswer)
      return unanswered[outcome.status]
    }
    const { save } = outcome.answer
    const asked = newLogin(title, site, outcome.answer)
    const access = accessFor(deps, conversation)
    const login = save ? await deps.logins.add(asked, access) : deps.logins.hold(asked, access)
    conversation.append(answerEntry, { id, status: save ? 'saved' : 'held', login: login.id } satisfies AskAnswer)
    return `${kept(login, save)} ${howTo(login)}`
  },
})
