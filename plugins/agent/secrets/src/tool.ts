import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { answerEntry, requestEntry, type SecretAnswer, type SecretRequest, type SecretStatus } from './contract'
import type { Outcome, Waits } from './waits'

const input = z.object({
  title: z.string().trim().min(1).max(100).describe("Card title, such as 'GitHub token'"),
  reason: z.string().trim().min(1).max(1000).describe('What it is for and where the user gets it'),
  placeholder: z.string().trim().min(1).max(100).optional().describe('Hint shown in the empty field, such as ghp_…'),
})

const description =
  'Ask the user for a secret (API key, token, password) in a private card, and wait until they answer. Use this instead of asking for a secret in chat; you never see the value. Saved, it returns the path of an owner-only file holding the value, deleted after 24 hours: read it inside your commands without printing it, e.g. TOKEN="$(cat <path>)" some-cli, or copy it into a git-ignored .env.'

const unanswered: Record<Exclude<SecretStatus, 'saved'>, string> = {
  declined: 'The user declined. Go on without it, or ask what to do instead.',
  timed_out: 'The user did not answer within 20 minutes. Call request_secret again if you still need it.',
  cancelled: 'Cancelled before the user answered.',
}

const resultOf = (outcome: Outcome) =>
  outcome.status === 'saved' ? `Saved to ${outcome.file}. Read it inside commands and never print it. It is deleted after 24 hours.` : unanswered[outcome.status]

export const secretTool = (waits: Waits): Tool<typeof input> => ({
  name: 'request_secret',
  description,
  input,
  active: session => session.kind !== 'agent',
  async run({ title, reason, placeholder }, { session, signal }) {
    const id = Bun.randomUUIDv7()
    session.append(requestEntry, { id, title, reason, ...(placeholder && { placeholder }) } satisfies SecretRequest)
    const outcome = await waits.wait(session.id, id, signal)
    session.append(answerEntry, { id, status: outcome.status } satisfies SecretAnswer)
    return resultOf(outcome)
  },
})
