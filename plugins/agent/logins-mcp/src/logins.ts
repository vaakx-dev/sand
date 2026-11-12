import type { InputOf } from '@sand/host-hub/contract'
import { loginAdd, loginChange, loginKinds, loginRemove, loginsState, loginsToolGroup, loginUses } from '@sand/logins/contract'
import type { McpTool } from '@sand/mcp-server/contract'
import { z } from 'zod'
import { group, loginId, name, secret, site } from './fields'

type Added = InputOf<typeof loginAdd>

const listInput = z.object({})

const addInput = z.object({
  kind: z.enum(loginKinds).describe('website for a sign-in with a username and password, key for an API key or token'),
  name,
  site: site.optional().describe("A website login's domain, such as bank.com"),
  username: secret.optional().describe("A website login's username"),
  password: secret.optional().describe("A website login's password"),
  totp: secret.optional().describe("A website login's authenticator secret or otpauth:// link, so login_code fills its codes"),
  value: secret.optional().describe("A key's value"),
})

const changeInput = z.object({
  id: loginId,
  name: name.optional(),
  site: site.optional(),
  username: secret.optional().describe('A new username for a website login'),
  password: secret.optional().describe('A new password for a website login'),
  value: secret.optional().describe('A new value for a key'),
  totp: secret.nullable().optional().describe('A new authenticator secret or otpauth:// link for a website login, or null to remove it'),
  bots: z.array(z.string().min(1)).optional().describe('The ids of every bot that may use it, replacing the list'),
  threads: z.array(z.string().min(1)).optional().describe('The ids of every thread that may use it, replacing the list'),
  ask: z.boolean().optional().describe('True to keep it for the user only ("Ask me every time"): no agent may use it'),
})

const idInput = z.object({ id: loginId })

const addedOf = ({ kind, name, site, username, password, totp, value }: z.output<typeof addInput>): Added => {
  if (kind === 'key') {
    if (!value) throw new Error('A key needs its value')
    return { kind, name, value }
  }
  if (!site || !username || !password) throw new Error('A website login needs its site, username and password')
  return { kind, name, site, username, password, ...(totp && { totp }) }
}

const listTool: McpTool<typeof listInput> = {
  name: 'login_list',
  description:
    "List the user's saved logins (website logins and keys) with their ids, which bots and threads may use each, and, for sand's own threads and bots, your access to each (allowed, ask: the user only, or unshared); also which password managers are connected. You never see a value: fill a website login with login_fill and login_code, pass a key to a Shell command with its logins parameter, or ask the user for a new one with request_secret",
  input: listInput,
  access: 'read',
  group: loginsToolGroup,
  run: async (input, { call }) => {
    const { logins, sources } = await call(loginsState, input)
    return { logins, managers: sources }
  },
}

const addTool: McpTool<typeof addInput> = {
  name: 'login_add',
  description:
    "Save a website login (site, username, password and an optional authenticator) or a key (value), kept encrypted. Saved by one of sand's own threads or bots, that thread or bot may use it at once; share it further with login_change. Returns the login without its values",
  input: addInput,
  secret: ['username', 'password', 'totp', 'value'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginAdd, addedOf(input)),
}

const changeTool: McpTool<typeof changeInput> = {
  name: 'login_change',
  description:
    'Change a saved login: rename it, move it to another site, replace its username, password, key value or authenticator, choose which bots and threads may use it, or keep it for the user only. Logins in a password manager change there, except for name, site and who may use them. Returns the login without its values',
  input: changeInput,
  secret: ['username', 'password', 'value', 'totp'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginChange, input),
}

const removeTool: McpTool<typeof idInput> = {
  name: 'login_remove',
  description: 'Delete a saved login. A login from a password manager stays in the manager. Returns the logins left',
  input: idInput,
  access: 'operate',
  group: group.name,
  run: async (input, { call }) => (await call(loginRemove, input)).logins,
}

const usesTool: McpTool<typeof idInput> = {
  name: 'login_uses',
  description: 'Show when a saved login was used, newest first: by which thread or bot, for what (fill, code or env), on which site and why it was allowed',
  input: idInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(loginUses, input),
}

const loginTools: McpTool[] = [listTool, addTool, changeTool, removeTool, usesTool]

export { loginTools }
