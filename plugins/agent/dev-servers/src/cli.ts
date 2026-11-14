import { cliCommands } from '@sand/cli-commands/contract'
import { type Daemon, daemon } from '@sand/host-daemon/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { type DevServer, devServerList, devServerStop } from './contract'
import { offerDevServerTools } from './tools'

const usage = [
  'sand servers                 list the web servers your threads started on this PC',
  'sand servers stop <port>     stop one, with the processes that run it',
].join('\n')

const printServers = (servers: DevServer[], json: boolean) => {
  if (json) return console.log(JSON.stringify(servers))
  for (const { url, name, command, session } of servers) console.log([url, name, session, command].join('  '))
}

const stopPort = async (host: Daemon, port: number, json: boolean) => {
  const stopped = await host.request(devServerStop, { port })
  if (json) console.log(JSON.stringify({ port, stopped }))
  else console.log(stopped ? `stopped the server on port ${port}` : `no server of a thread listens on port ${port}`)
  return stopped ? 0 : 1
}

const actionOf = ([verb, port]: string[]) => {
  if (verb === undefined || verb === 'list') return { kind: 'list' } as const
  if (verb === 'stop' && Number(port) > 0) return { kind: 'stop', port: Number(port) } as const
  return undefined
}

export default definePlugin({
  name: 'dev-servers-cli',
  description: 'The sand servers command, and the dev server tools for sand mcp',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'servers',
        summary: 'list and stop the web servers your threads started',
        usage,
        options: { json: { type: 'boolean', help: 'sand servers: print JSON' } },
        async run(args, values) {
          const action = actionOf(args)
          if (!action) {
            console.error(`usage:\n${usage}`)
            return 2
          }
          const json = values.json === true
          if (action.kind === 'stop') return stopPort(ctx.daemon, action.port, json)
          printServers(await ctx.daemon.request(devServerList, {}), json)
        },
      }),
    )
    ctx.watch(mcpTools, tools => tools && offerDevServerTools(tools))
  },
})
