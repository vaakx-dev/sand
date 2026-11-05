import type { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { cliCommands } from '@sand/cli-commands/contract'
import { cli } from '@sand/config/contract'
import { type Daemon, daemon } from '@sand/host-daemon/contract'
import { failure } from '@sand/orchestrator/contract'
import { errorMessage } from '@sand/util'
import { definePlugin } from 'drydock'
import { threadsServer, type Use } from './server'

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
  name: 'mcp',
  description: "The sand mcp command: an MCP server on stdio that lets an outside agent list, read, start, message, wait for and stop sand's threads",
  inject: { cli, cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'mcp',
        summary: "serve sand's threads to an outside agent over MCP",
        usage: [
          "sand mcp                        serve sand's threads to an outside agent over MCP on stdio, through the running sand;",
          '                                add it with: claude mcp add sand-threads -- sand mcp',
        ].join('\n'),
        run: () => serve(threadsServer(linked(ctx.daemon), { access: 'operate', here: ctx.cli.cwd })),
      }),
    )
  },
})
