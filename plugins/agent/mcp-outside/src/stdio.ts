import type { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { cliCommands } from '@sand/cli-commands/contract'
import { cli } from '@sand/config/contract'
import { type Daemon, daemon } from '@sand/host-daemon/contract'
import { failure } from '@sand/orchestrator/contract'
import { errorMessage } from '@sand/util'
import { definePlugin } from 'drydock'
import { provideTools } from './registry'
import { mcpServer, type Use } from './server'

const linked =
  (found: Daemon): Use =>
  async work => {
    const link = await found.link().catch(error => {
      throw failure('unavailable', errorMessage(error))
    })
    try {
      return await work(link.call)
    } finally {
      link.close()
    }
  }

const serve = async (server: McpServer) => {
  const closed = Promise.withResolvers<number>()
  server.server.onclose = () => closed.resolve(0)
  await server.connect(new StdioServerTransport())
  return closed.promise
}

export default definePlugin({
  name: 'mcp-outside',
  description: 'The sand mcp command: an MCP server on stdio that offers an outside agent the tools other features register, such as threads and bots',
  inject: { cli, cliCommands, daemon },
  apply(ctx) {
    const tools = provideTools(ctx)
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'mcp',
        summary: 'serve sand to an outside agent over MCP',
        usage: [
          'sand mcp                        serve sand to an outside agent over MCP on stdio, through the running sand;',
          '                                add it with: claude mcp add sand -- sand mcp',
        ].join('\n'),
        run: () => serve(mcpServer(linked(ctx.daemon), tools(), { access: 'operate', here: ctx.cli.cwd })),
      }),
    )
  },
})
