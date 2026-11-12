import type { InputOf } from '@sand/host-hub/contract'
import { askDecline, askWaiting, codeAnswer, secretSave } from '@sand/logins/contract'
import type { McpTool } from '@sand/mcp-server/contract'
import { z } from 'zod'
import { group, requestId, secret, session } from './fields'

type Secret = InputOf<typeof secretSave>

type Code = InputOf<typeof codeAnswer>

const waitingInput = z.object({ session: z.string().trim().min(1).optional().describe('Only the requests in this thread or bot (default: all on this PC)') })

const targetInput = z.object({ session, id: requestId })

const secretInput = targetInput.extend({
  save: z.boolean().describe('True to save it as a login, false to hold it for one use only'),
  value: secret.optional().describe('The key or token, when the request has no site'),
  username: secret.optional().describe('The username, when the request names a site'),
  password: secret.optional().describe('The password, when the request names a site'),
})

const codeInput = targetInput.extend({
  code: z.string().trim().min(1).max(64).optional().describe('The code the sign-in asks for'),
  approved: z.literal(true).optional().describe('True when the sign-in was approved on another device instead of with a code'),
})

const secretOf = ({ session, id, save, value, username, password }: z.output<typeof secretInput>): Secret => {
  if (value) return { session, id, save, value }
  if (!username || !password) throw new Error('Give the value, or the username and password')
  return { session, id, save, username, password }
}

const codeOf = ({ session, id, code, approved }: z.output<typeof codeInput>): Code => {
  if (code) return { session, id, code }
  if (!approved) throw new Error('Give the code, or approved: true')
  return { session, id, approved }
}

const waitingTool: McpTool<typeof waitingInput> = {
  name: 'login_waiting',
  description:
    'List the requests waiting for the user to answer in a private card: request_secret asking for a key or website login (kind secret) and login_code asking for a sign-in code (kind code), with the thread or bot each waits in',
  input: waitingInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(askWaiting, input),
}

const secretTool: McpTool<typeof secretInput> = {
  name: 'login_answer_secret',
  description:
    'Answer a waiting request_secret for the user: a value for a key, or a username and password when it names a site. The asking thread or bot gets a login it may use, never the value',
  input: secretInput,
  access: 'operate',
  group: group.name,
  run: async (input, { call }) => {
    await call(secretSave, secretOf(input))
    return 'Answered'
  },
}

const codeTool: McpTool<typeof codeInput> = {
  name: 'login_answer_code',
  description: 'Answer a waiting login_code for the user: the code is filled into the sign-in page and never saved, or say the sign-in was approved on another device',
  input: codeInput,
  access: 'operate',
  group: group.name,
  run: async (input, { call }) => {
    await call(codeAnswer, codeOf(input))
    return 'Answered'
  },
}

const declineTool: McpTool<typeof targetInput> = {
  name: 'login_decline',
  description: 'Decline a waiting request_secret or login_code for the user: the asking thread or bot is told the user said no',
  input: targetInput,
  access: 'operate',
  group: group.name,
  run: async (input, { call }) => {
    await call(askDecline, input)
    return 'Declined'
  },
}

const askTools: McpTool[] = [waitingTool, secretTool, codeTool, declineTool]

export { askTools }
