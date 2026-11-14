import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { devServerList, devServerOpen, devServerStop } from './contract'

const group: McpGroup = { name: 'dev-servers', label: 'Dev servers', summary: 'list, open and stop the web servers your threads started' }

const listInput = z.object({
  thread: z.string().optional().describe("Only this thread's servers (default: yours when a thread asks, or every thread's on this PC)"),
})

const portInput = z.object({
  port: z.number().int().positive().describe('The port the server listens on, from dev_server_list'),
})

const listTool: McpTool<typeof listInput> = {
  name: 'dev_server_list',
  description:
    "List the web servers a thread started on this PC that are still running, including ones left running after the command or turn ended: each one's port, local URL, process, the command that started it and its thread",
  input: listInput,
  access: 'read',
  group: group.name,
  run: ({ thread }, { call }) => call(devServerList, { session: thread }),
}

const openTool: McpTool<typeof portInput> = {
  name: 'dev_server_open',
  description:
    "Get links that open a web server a thread started on this PC from the user's own devices, like their phone, one for each address sand listens on. Give the user the one their device reaches; the first open uses it up, and unused links expire after 10 minutes",
  input: portInput,
  access: 'operate',
  group: group.name,
  run: ({ port }, { call }) => call(devServerOpen, { port }),
}

const stopTool: McpTool<typeof portInput> = {
  name: 'dev_server_stop',
  description: 'Stop a web server a thread started on this PC, with the processes that run it. Returns false if no such server is running',
  input: portInput,
  access: 'operate',
  group: group.name,
  run: ({ port }, { call }) => call(devServerStop, { port }),
}

const offerDevServerTools = (tools: McpTools) => joinDisposers(tools.group(group), tools.register(listTool), tools.register(openTool), tools.register(stopTool))

export { offerDevServerTools }
