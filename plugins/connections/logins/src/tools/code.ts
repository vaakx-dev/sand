import type { Tool, ToolContext } from '@sand/tools/contract'
import { z } from 'zod'
import { answerEntry, type AskAnswer, codeEntry, type CodeRequest } from '../contract'
import { type Saved, websiteOf } from '../service'
import type { Unanswered } from '../waits'
import { computerInput, fillerOf, group, loginAct, loginInput, type ToolDeps } from './deps'
import { filledText } from './fill'

const answerTimeout = 10 * 60_000
const settleGrace = 30_000

const input = z.object({
  login: loginInput,
  prompt: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .describe("What the page asks for, such as 'Enter the code we texted to ••• 1234' or 'Approve the sign-in in your banking app'"),
  ref: z.string().trim().min(1).optional().describe('The ref of the code field from computer_elements, when the page has more than one field'),
  computer: computerInput,
})

type Enter = (code: string) => Promise<string>

const unanswered: Record<Unanswered, string> = {
  declined: 'The user declined to sign in. Go on without it, or ask what to do instead.',
  timed_out: 'The user did not answer within 10 minutes. Call login_code again if the page still asks.',
  cancelled: 'Cancelled before the user answered.',
}

const askUser = async (deps: ToolDeps, entry: Saved, site: string, prompt: string, enter: Enter, context: ToolContext) => {
  const { conversation, signal } = context
  const id = Bun.randomUUIDv7()
  conversation.append(codeEntry, { id, login: entry.id, name: entry.name, site, prompt } satisfies CodeRequest)
  const done = context.wait({ kind: 'secret', call: context.call.id, title: `Sign in to ${entry.name}` })
  deps.needs(conversation, `Sign in to ${entry.name}: ${prompt}`)
  const outcome = await deps.codes.wait(conversation.id, id, answerTimeout, signal).finally(done)
  if (outcome.status !== 'answered') {
    conversation.append(answerEntry, { id, status: outcome.status, login: entry.id } satisfies AskAnswer)
    return unanswered[outcome.status]
  }
  const { answer } = outcome
  conversation.append(answerEntry, { id, status: 'code' in answer ? 'filled' : 'approved', login: entry.id } satisfies AskAnswer)
  await deps.logins.record(entry, { conversation, action: 'code', site }, 'user')
  return 'code' in answer ? enter(answer.code) : 'The user approved the sign-in. Take a screenshot to see where the page went.'
}

export const codeTool = (deps: ToolDeps): Tool<typeof input> => ({
  name: 'login_code',
  group,
  description:
    "Get past a sign-in's two-step check on the page open in the browser. With an authenticator saved for the login, fills its current code at once. Otherwise asks the user: they type the code they got into a private card, which fills it into the page, or say they approved the sign-in on their phone. You never see the code. Submit the form yourself after.",
  input,
  needs: ['computer'],
  timeoutMs: answerTimeout + settleGrace,
  act: ({ login }, conversation) => (deps.logins.find(login).totp ? loginAct(deps, login, conversation) : { effect: 'read' }),
  async run({ login, prompt, ref, computer }, context) {
    const entry = deps.logins.find(login)
    const site = websiteOf(entry)
    const fill = fillerOf(deps, computer)
    const enter: Enter = async code => {
      deps.logins.remember(code, entry.name)
      return filledText(await fill({ site, code, ...(ref && { ref }) }))
    }
    if (!entry.totp) return askUser(deps, entry, site, prompt, enter, context)
    return enter(await deps.logins.code(login, { conversation: context.conversation, action: 'code', site }))
  },
})
