import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'
import { devServerList, devServerOpen, devServerShare, devServerStop, shareInput } from './contract'

const group: McpGroup = { name: 'dev-servers', label: 'Dev servers', summary: 'share websites with the user, and list, open and stop the web servers your threads and bots started' }

const SHARED =
  "Shared as a card in the chat; the user opens it there, so don't paste links. The links open it once each within 10 minutes, only for a user who isn't in this chat"

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
    "Get one-time links that open a dev server on the user's other devices, like their phone. To show the user a website, use dev_server_share instead",
  input: portInput,
  access: 'operate',
  group: group.name,
  run: ({ port }, { call }) => call(devServerOpen, { port }),
}

const shareTool: McpTool<ReturnType<typeof shareInput>> = {
  name: 'dev_server_share',
  description:
    'Show the user a website you made: serves a folder of static files, or shares a web server this thread started, as a card in the chat that opens it on their PC or phone. Use it whenever you built a site or page for the user to open',
  input: shareInput(),
  access: 'operate',
  group: group.name,
  async run(input, { call }) {
    const { port } = await call(devServerShare, input)
    return { shared: SHARED, port, links: await call(devServerOpen, { port }) }
  },
}

const stopTool: McpTool<typeof portInput> = {
  name: 'dev_server_stop',
  description: 'Stop a web server a thread or bot started on this PC, with its processes',
  input: portInput,
  access: 'operate',
  group: group.name,
  run: ({ port }, { call }) => call(devServerStop, { port }),
}

const offerDevServerTools = (tools: McpTools) => joinDisposers(tools.group(group), tools.register(listTool), tools.register(shareTool), tools.register(openTool), tools.register(stopTool))

export { offerDevServerTools }
