import { cliCommands } from '@sand/cli-commands/contract'
import { type Daemon, daemon } from '@sand/host-daemon/contract'
import { mcpTools } from '@sand/mcp-server/contract'
import { definePlugin } from 'drydock'
import { type DevServer, devServerList, devServerOpen, devServerStop } from './contract'
import { offerDevServerTools } from './tools'

const usage = [
  'sand servers                 list the web servers your threads started on this PC',
  'sand servers open <port>     print links that open one from your devices; each opens once, within 10 minutes',
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

const openPort = async (host: Daemon, port: number, json: boolean) => {
  const links = await host.request(devServerOpen, { port })
  console.log(json ? JSON.stringify({ port, links }) : links.join('\n'))
}

const actionOf = ([verb, port]: string[]) => {
  if (verb === undefined || verb === 'list') return { kind: 'list' } as const
  if ((verb === 'open' || verb === 'stop') && Number(port) > 0) return { kind: verb, port: Number(port) } as const
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
        summary: 'list, open and stop the web servers your threads started',
        usage,
        options: { json: { type: 'boolean', help: 'sand servers: print JSON' } },
        async run(args, values) {
          const action = actionOf(args)
          if (!action) {
            console.error(`usage:\n${usage}`)
            return 2
          }
          const json = values.json === true
          switch (action.kind) {
            case 'list':
              return printServers(await ctx.daemon.request(devServerList, {}), json)
            case 'open':
              return openPort(ctx.daemon, action.port, json)
            case 'stop':
              return stopPort(ctx.daemon, action.port, json)
          }
        },
      }),
    )
    ctx.watch(mcpTools, tools => tools && offerDevServerTools(tools))
  },
})
