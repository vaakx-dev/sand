import type { ConversationRef } from '@sand/engine/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { answerEntry, type AskAnswer, type Login, secretEntry, type SecretRequest } from '../contract'
import { siteOf } from '../service'
import type { SecretAnswer, Unanswered } from '../waits'
import { group, type ToolDeps } from './deps'

const answerTimeout = 20 * 60_000
const settleGrace = 30_000

const input = z.object({
  title: z.string().trim().min(1).max(100).describe("Card title, which also names the saved login, such as 'GitHub token' or 'Northbank'"),
  reason: z.string().trim().min(1).max(1000).describe('What it is for and where the user gets it'),
  placeholder: z.string().trim().min(1).max(100).optional().describe('Hint shown in the empty field, such as ghp_…'),
  site: z.string().trim().min(1).max(253).optional().describe('For a website login, its domain, such as bank.com: the card then asks for a username and password'),
})

const description =
  'Ask the user for a secret in a private card and wait until they answer: an API key or token, or with site a website login (username and password). Use this instead of asking for a secret in chat; you never see the value. Saved, it becomes one of the logins: pass a key to Shell with its logins parameter, or fill a website login into the browser with login_fill.'

const unanswered: Record<Unanswered, string> = {
  declined: 'The user declined. Go on without it, or ask what to do instead.',
  timed_out: 'The user did not answer within 20 minutes. Call request_secret again if you still need it.',
  cancelled: 'Cancelled before the user answered.',
}

const usage = ({ id, kind }: Login) =>
  kind === 'website'
    ? `Saved as login ${id}. Fill it into the sign-in page with login_fill { login: "${id}" }.`
    : `Saved as login ${id}. Pass it to a Shell command as an environment variable with its logins parameter, e.g. logins: { "API_TOKEN": "${id}" }, and never print it.`

const accessFor = ({ logins }: ToolDeps, conversation: ConversationRef) => {
  const { bot } = logins.responsible(conversation)
  return bot ? { bots: [bot], threads: [] } : { bots: [], threads: [conversation.id] }
}

const newLogin = (name: string, site: string | undefined, answer: SecretAnswer) => {
  if (site && 'username' in answer) return { kind: 'website' as const, name, site, ...answer }
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
  async run({ title, reason, placeholder, site: given }, context) {
    const { conversation, signal } = context
    const site = given && siteOf(given)
    const id = Bun.randomUUIDv7()
    conversation.append(secretEntry, { id, title, reason, ...(placeholder && { placeholder }), ...(site && { site }) } satisfies SecretRequest)
    const done = context.wait({ kind: 'secret', call: context.call.id, title })
    const outcome = await deps.secrets.wait(conversation.id, id, answerTimeout, signal).finally(done)
    if (outcome.status !== 'answered') {
      conversation.append(answerEntry, { id, status: outcome.status } satisfies AskAnswer)
      return unanswered[outcome.status]
    }
    const login = await deps.logins.add(newLogin(title, site, outcome.answer), accessFor(deps, conversation))
    conversation.append(answerEntry, { id, status: 'saved', login: login.id } satisfies AskAnswer)
    return usage(login)
  },
})
