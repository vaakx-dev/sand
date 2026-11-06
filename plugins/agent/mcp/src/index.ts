import { media } from '@sand/media/contract'
import { server } from '@sand/server/contract'
import { tools, toolsChange } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { serverConfig, serverName } from './config'
import { mcpServers, mcpServersWire } from './contract'
import { mountServer, type MountedServer, type Needs } from './servers'

export default definePlugin({
  name: 'mcp',
  description: "MCP client: connects to the user's MCP servers from sand.toml and registers each server's tools as an on-demand tool group",
  inject: { tools, media },
  config: z.object({ servers: z.record(serverName, serverConfig).default({}) }),
  apply(ctx, { servers }) {
    const mounted: MountedServer[] = []
    const states = () => mounted.map(each => each.state())
    const needs: Needs = {
      tools: ctx.tools,
      media: ctx.media,
      changed: () => ctx.get(server)?.broadcast(mcpServersWire, states()),
      report: error => ctx.report(error),
    }
    for (const [name, config] of Object.entries(servers)) {
      ctx.effect(() => {
        const each = mountServer(needs, name, config)
        mounted.push(each)
        return each.dispose
      })
    }
    ctx.on(toolsChange, () => mounted.forEach(each => each.sync()))
    ctx.watch(server, found => found?.handle(mcpServers, states))
  },
})
