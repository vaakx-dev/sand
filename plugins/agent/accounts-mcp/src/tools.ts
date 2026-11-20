import { loginAdd, loginCancel, loginDetect, loginFinish, loginKey, loginLogout, loginRename, loginServer, loginShared, loginStart, loginStatus } from '@sand/accounts/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'

const group: McpGroup = {
  name: 'accounts',
  label: 'Model accounts',
  summary: 'sign in and out of model accounts, add more plan accounts, save API keys and add local model servers',
}

const shared = { feature: 'pcs', description: 'Also shows which accounts are shared between your PCs.' }

const account = z.string().min(1).describe('The account id, from account_list')

const listInput = z.object({})
const accountInput = z.object({ account })
const startInput = z.object({
  account,
  anyway: z.boolean().optional().describe('Sign in here though another PC already shares this account'),
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
const renameInput = z.object({ account, name: z.string().trim().min(1).max(60).describe('The new name, like "Work"') })
const shareInput = z.object({ account, shared: z.boolean().describe('Whether your other PCs may use this account') })

const listTool: McpTool<typeof listInput> = {
  name: 'account_list',
  description: 'List the API keys, sign-in plans and local servers sand uses for models on this PC.',
  parts: [shared],
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(loginStatus, input),
}

const signInTool: McpTool<typeof startInput> = {
  name: 'account_sign_in',
  description: "Start signing in to a plan account, then hand the user the result's URL and code. For a \"paste\" sign-in, ask for the code it shows and call account_finish_sign_in.",
  input: startInput,
  parts: [
    {
      feature: 'pcs',
      fields: ['anyway'],
      description: 'On a conflict with an account another PC shares, ask the user, then call again with anyway or call account_cancel_sign_in.',
    },
  ],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginStart, input),
}

const finishTool: McpTool<typeof finishInput> = {
  name: 'account_finish_sign_in',
  description: 'Finish a "paste" sign-in with the code the user copied.',
  input: finishInput,
  secret: ['code'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginFinish, input),
}

const addTool: McpTool<typeof accountInput> = {
  name: 'account_add',
  description:
    'Add a second account of a sign-in plan, like another Claude account, from the plan account whose "another" is true. Then sign it in with account_sign_in.',
  input: accountInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginAdd, input),
}

const renameTool: McpTool<typeof renameInput> = {
  name: 'account_rename',
  description: 'Rename a plan account, like a Claude account, so the accounts of one plan are easy to tell apart.',
  input: renameInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginRename, input),
}

const cancelTool: McpTool<typeof accountInput> = {
  name: 'account_cancel_sign_in',
  description: 'Stop a waiting sign-in, or clear its conflict or error.',
  input: accountInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginCancel, input),
}

const keyTool: McpTool<typeof keyInput> = {
  name: 'account_save_key',
  description: 'Save an Anthropic, OpenAI or OpenRouter API key the user gave you.',
  input: keyInput,
  secret: ['key'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginKey, input),
}

const serverTool: McpTool<typeof serverInput> = {
  name: 'account_save_server',
  description: 'Add or change a local or self-hosted model server, like Ollama or LM Studio, and check that it answers.',
  input: serverInput,
  secret: ['key'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginServer, input),
}

const findServersTool: McpTool<typeof listInput> = {
  name: 'account_find_servers',
  description: 'Find model servers running on this PC that are not added yet. Add one with account_save_server',
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(loginDetect, input),
}

const signOutTool: McpTool<typeof accountInput> = {
  name: 'account_sign_out',
  description: 'Sign out of an account, forget its key, or remove a model server or an added account.',
  input: accountInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginLogout, input),
}

const shareTool: McpTool<typeof shareInput> = {
  name: 'account_share',
  description: 'Let your other PCs use an account saved on this PC, or stop them.',
  feature: 'pcs',
  input: shareInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginShared, input),
}

const accountTools = [listTool, addTool, signInTool, finishTool, renameTool, cancelTool, keyTool, serverTool, findServersTool, signOutTool, shareTool]

const offerAccountTools = (tools: McpTools) => joinDisposers(tools.group(group), ...accountTools.map(tool => tools.register(tool)))

export { keyTool, listTool, offerAccountTools, serverTool, shareTool, signInTool, signOutTool }
