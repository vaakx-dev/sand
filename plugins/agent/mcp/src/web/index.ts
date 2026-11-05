import { wire, wireHello } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { mcpServers, mcpServersWire, type ServerState } from '../contract'
import { serversPage } from './page'

export default definePlugin({
  name: 'mcp-web',
  description: 'MCP servers settings page: each server from sand.toml, its address and whether it is connected',
  inject: { wire, kit },
  apply(ctx) {
    const servers = sig<ServerState[] | undefined>(undefined)
    const load = () =>
      ctx.wire.call(mcpServers, {}).then(
        value => servers.set(value),
        () => servers.set(undefined),
      )
    ctx.on(wireHello, () => void load())
    if (ctx.wire.ready()) void load()
    ctx.effect(() => ctx.wire.on(mcpServersWire, value => servers.set(value)))
    ctx.watch(settings, found => found?.page({ id: 'mcp', label: 'MCP servers', icon: 'server', order: 23, render: () => serversPage(ctx.kit, servers) }))
  },
})
