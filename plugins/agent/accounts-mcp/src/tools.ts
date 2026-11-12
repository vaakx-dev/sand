import { loginCancel, loginDetect, loginFinish, loginKey, loginLogout, loginServer, loginShared, loginStart, loginStatus } from '@sand/accounts/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'

const group: McpGroup = {
  name: 'accounts',
  label: 'Model accounts',
  summary: 'sign in and out of model accounts, save API keys, add local model servers and share accounts with your other PCs',
}

const state =
  'Returns every account (id, label, whether it is signed in, how, whether it is shared, and any pending sign-in, conflict or error), the accounts your other PCs share and the PCs using this one. Keys and tokens never come back'

const account = z.string().min(1).describe('The account id, from account_list')

const listInput = z.object({})
const accountInput = z.object({ account })
const startInput = z.object({
  account,
  anyway: z.boolean().optional().describe('Sign in here even though another PC already shares this account with this one'),
})
const finishInput = z.object({ account, code: z.string().min(1).describe('The code the user copied from the sign-in page') })
const keyInput = z.object({
  account: z.enum(['anthropic', 'openai', 'openrouter']).describe('The provider the key is for'),
  key: z.string().min(1).describe('The API key the user gave you'),
  baseUrl: z.string().optional().describe('A different address for the API, when the user gave one'),
})
const serverInput = z.object({
  id: z.string().optional().describe('The server account id to change, from account_list (default: add a new server)'),
  name: z.string().min(1).describe('A name for the server'),
  url: z.string().min(1).describe('Its OpenAI-style API address, like http://localhost:11434/v1'),
  key: z.string().optional().describe('The API key the server needs, when it needs one'),
  provider: z.enum(['ollama', 'lmstudio', 'server']).optional().describe('What runs it (default: guessed from the port)'),
})
const shareInput = z.object({ account, shared: z.boolean().describe('Whether your other PCs may use this account') })

const listTool: McpTool<typeof listInput> = {
  name: 'account_list',
  description: `List the model accounts on this PC: the API keys, sign-in plans and local servers sand uses for models. ${state}`,
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(loginStatus, input),
}

const signInTool: McpTool<typeof startInput> = {
  name: 'account_sign_in',
  description: `Start signing in to a plan account. Then hand the user the account's pending sign-in: for "device", the URL and the code to enter there; for "paste", the URL, then ask for the code it shows and call account_finish_sign_in; for "browser", the URL. Check account_list to see it finish. When it reports a conflict, ask the user, then call again with anyway or call account_cancel_sign_in. ${state}`,
  input: startInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginStart, input),
}

const finishTool: McpTool<typeof finishInput> = {
  name: 'account_finish_sign_in',
  description: `Finish a "paste" sign-in with the code the user copied from the sign-in page. ${state}`,
  input: finishInput,
  secret: ['code'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginFinish, input),
}

const cancelTool: McpTool<typeof accountInput> = {
  name: 'account_cancel_sign_in',
  description: `Stop a sign-in that is still waiting, or clear its conflict or error. ${state}`,
  input: accountInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginCancel, input),
}

const keyTool: McpTool<typeof keyInput> = {
  name: 'account_save_key',
  description: `Save an Anthropic, OpenAI or OpenRouter API key the user gave you, replacing the one saved before. ${state}`,
  input: keyInput,
  secret: ['key'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginKey, input),
}

const serverTool: McpTool<typeof serverInput> = {
  name: 'account_save_server',
  description: `Add a local or self-hosted model server, like Ollama or LM Studio, or change one, and check that it answers. ${state}`,
  input: serverInput,
  secret: ['key'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginServer, input),
}

const findServersTool: McpTool<typeof listInput> = {
  name: 'account_find_servers',
  description: 'Look for model servers running on this PC that are not added yet: name, address, what runs it and how many models it has. Add one with account_save_server',
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(loginDetect, input),
}

const signOutTool: McpTool<typeof accountInput> = {
  name: 'account_sign_out',
  description: `Sign out of an account, forget its saved key, or remove a model server. ${state}`,
  input: accountInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginLogout, input),
}

const shareTool: McpTool<typeof shareInput> = {
  name: 'account_share',
  description: `Let your other PCs use an account saved on this PC, or stop them. ${state}`,
  input: shareInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginShared, input),
}

const accountTools = [listTool, signInTool, finishTool, cancelTool, keyTool, serverTool, findServersTool, signOutTool, shareTool]

const offerAccountTools = (tools: McpTools) => joinDisposers(tools.group(group), ...accountTools.map(tool => tools.register(tool)))

export { keyTool, listTool, offerAccountTools, serverTool, shareTool, signInTool, signOutTool }
