import { connectionCancel, connectionClient, connectionRemove, connectionSave, connectionStart, connectionState } from '@sand/connections/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'

const group: McpGroup = {
  name: 'connections',
  label: 'Connections',
  summary: 'connect and disconnect your accounts at other services, like Google, Outlook or iCloud calendars',
}

const kind = z.string().min(1).describe('The kind of account, from connection_list')

const listInput = z.object({})
const clientInput = z.object({
  kind,
  id: z.string().min(1).describe('The OAuth client ID the user made'),
  secret: z.string().optional().describe('Its client secret, when the service gave one'),
})
const startInput = z.object({ kind, readOnly: z.boolean().optional().describe('Ask only to read, when the kind offers that') })
const cancelInput = z.object({ flow: z.string().min(1).describe('The flow id connection_start returned') })
const saveInput = z.object({
  kind,
  values: z.record(z.string(), z.string()).describe("The form's fields by key, as connection_list lists them, filled with what the user gave you"),
})
const removeInput = z.object({ account: z.string().min(1).describe('The connected account id, from connection_list') })

const listTool: McpTool<typeof listInput> = {
  name: 'connection_list',
  description: 'List your accounts at other services, like calendars, and the kinds you can connect with their setup steps',
  input: listInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(connectionState, input),
}

const clientTool: McpTool<typeof clientInput> = {
  name: 'connection_set_client',
  description: "Set the OAuth client a kind signs in with, from the client ID the user made by following the kind's setup steps",
  input: clientInput,
  secret: ['secret'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(connectionClient, input),
}

const startTool: McpTool<typeof startInput> = {
  name: 'connection_start',
  description:
    'Start connecting an account of an OAuth kind, and hand the user the URL it returns. Set the client with connection_set_client first when the kind has none',
  input: startInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(connectionStart, input),
}

const cancelTool: McpTool<typeof cancelInput> = {
  name: 'connection_cancel',
  description: 'Stop a waiting connection_start sign-in',
  input: cancelInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(connectionCancel, input),
}

const saveTool: McpTool<typeof saveInput> = {
  name: 'connection_save',
  description:
    'Connect an account of a form kind, like an iCloud calendar with an app password, from the values the user gave you',
  input: saveInput,
  secret: ['values'],
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(connectionSave, input),
}

const removeTool: McpTool<typeof removeInput> = {
  name: 'connection_remove',
  description: 'Disconnect an account and forget its sign-in',
  input: removeInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(connectionRemove, input),
}

const connectionTools = [listTool, clientTool, startTool, cancelTool, saveTool, removeTool]

const offerConnectionTools = (tools: McpTools) => joinDisposers(tools.group(group), ...connectionTools.map(tool => tools.register(tool)))

export { clientTool, listTool, offerConnectionTools, removeTool, saveTool, startTool }
