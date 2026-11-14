import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { devServerList, devServerStop } from './contract'

const group: McpGroup = { name: 'dev-servers', label: 'Dev servers', summary: 'list and stop the web servers your threads started' }

const listInput = z.object({
  thread: z.string().optional().describe("Only this thread's servers (default: yours when a thread asks, or every thread's on this PC)"),
})

const stopInput = z.object({
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

const stopTool: McpTool<typeof stopInput> = {
  name: 'dev_server_stop',
  description: 'Stop a web server a thread started on this PC, with the processes that run it. Returns false if no such server is running',
  input: stopInput,
  access: 'operate',
  group: group.name,
  run: ({ port }, { call }) => call(devServerStop, { port }),
}

const offerDevServerTools = (tools: McpTools) => joinDisposers(tools.group(group), tools.register(listTool), tools.register(stopTool))

export { offerDevServerTools }
