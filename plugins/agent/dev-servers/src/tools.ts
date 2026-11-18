import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { devServerList, devServerOpen, devServerStop } from './contract'

const group: McpGroup = { name: 'dev-servers', label: 'Dev servers', summary: 'list, open and stop the web servers your threads and bots started' }

const listInput = z.object({
  thread: z.string().optional().describe("Only this thread's or bot's servers"),
})

const portInput = z.object({
  port: z.number().int().positive().describe('The port the server listens on, from dev_server_list'),
})

const listTool: McpTool<typeof listInput> = {
  name: 'dev_server_list',
  description:
    'List the running web servers threads and bots started on this PC, including ones left after their command or turn ended',
  input: listInput,
  access: 'read',
  group: group.name,
  run: ({ thread }, { call }) => call(devServerList, { session: thread }),
}

const openTool: McpTool<typeof portInput> = {
  name: 'dev_server_open',
  description:
    "Get one-time links that open a dev server on the user's other devices, like their phone. Give the user the one their device reaches",
  input: portInput,
  access: 'operate',
  group: group.name,
  run: ({ port }, { call }) => call(devServerOpen, { port }),
}

const stopTool: McpTool<typeof portInput> = {
  name: 'dev_server_stop',
  description: 'Stop a web server a thread or bot started on this PC, with its processes',
  input: portInput,
  access: 'operate',
  group: group.name,
  run: ({ port }, { call }) => call(devServerStop, { port }),
}

const offerDevServerTools = (tools: McpTools) => joinDisposers(tools.group(group), tools.register(listTool), tools.register(openTool), tools.register(stopTool))

export { offerDevServerTools }
