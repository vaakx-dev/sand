import type { HostBuild } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { buildInfo } from './build'
import { installRequests } from './install/requests'
import { installRoutes } from './install/routes'
import { createInstallKeys } from './installs'

export const distPlugin = definePlugin({
  name: 'dist',
  description: 'The build id of this sand, and the Add a PC links that pair a new PC and copy its plugins',
  inject: ['hostApp', 'hostOptions', 'hostHttp', 'hub', 'hostRemotes'],
  apply(ctx) {
    const installs = createInstallKeys({ report: progress => ctx.hub.broadcast({ name: 'install.progress', args: [progress] }) })
    const build: HostBuild = { info: () => buildInfo(ctx.hostApp.root()) }
    ctx.provide('hostBuild', build)
    const routes = installRoutes({
      home: ctx.hostOptions.home,
      id: ctx.hostOptions.device.id,
      name: ctx.hostOptions.device.name,
      installs,
      remotes: ctx.hostRemotes,
    })
    for (const [path, route] of routes) ctx.effect(() => ctx.hostHttp.route(path, route))
    for (const setup of installRequests(ctx.hub, installs)) ctx.effect(setup)
  },
})
