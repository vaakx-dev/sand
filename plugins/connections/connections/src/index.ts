import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { openVault } from '@sand/vault'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { connectionFlowWire, connectionRemoved, connections, connectionsChange } from './contract'
import { serveConnections } from './serve'
import { createConnections } from './service'
import type { Data } from './vault'

export default definePlugin({
  name: 'connections',
  description: 'Keeps accounts at other services encrypted, signs in to them with OAuth or a form, and makes authorized requests for the plugins that use them',
  inject: { paths },
  config: z.object({ keychain: z.boolean().default(true) }).default({ keychain: true }),
  async apply(ctx, { keychain }) {
    const vault = await openVault<Data>(ctx.paths.home, 'connections', keychain && Bun.env.SAND_KEYCHAIN !== 'off' ? Bun.secrets : undefined)
    const runtime = createConnections(vault, (await vault.read()) ?? { entries: [], clients: {} }, {
      changed: () => ctx.emit(connectionsChange, runtime.service.accounts()),
      removed: account => ctx.emit(connectionRemoved, account),
      ended: end => ctx.get(server)?.broadcast(connectionFlowWire, end),
    })
    ctx.effect(() => runtime.close)
    ctx.provide(connections, runtime.service)
    serveConnections(ctx, runtime)
  },
})
