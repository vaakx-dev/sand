import type { HostBuild } from '@sand/protocol'
import { hostPaths } from '@sand/kit'
import { definePlugin } from 'drydock'
import { buildInfo } from './build'
import { bunRoute } from './bun/route'
import { createBundle } from './bundle'
import { installRequests } from './install/requests'
import { installRoutes } from './install/routes'
import { createInstallKeys } from './installs'
import { bundleRoute } from './route'

export const distPlugin = definePlugin({
  name: 'dist',
  description: 'The sand bundle, build id and Bun build that other PCs install or update from, and the Add a PC install links',
  inject: ['hostApp', 'hostOptions', 'hostHttp', 'hostDevices', 'hub', 'hostRemotes'],
  apply(ctx) {
    const root = () => ctx.hostApp.root()
    const installs = createInstallKeys({ report: progress => ctx.hub.broadcast({ name: 'install.progress', args: [progress] }) })
    const build: HostBuild = { info: () => buildInfo(root()), bundle: () => createBundle(root()) }
    ctx.provide('hostBuild', build)
    ctx.effect(() => ctx.hostHttp.route(hostPaths.bundle, bundleRoute({ build, devices: ctx.hostDevices, installs })))
    ctx.effect(() => ctx.hostHttp.route(hostPaths.bun, bunRoute({ home: ctx.hostOptions.home, devices: ctx.hostDevices, installs })))
    const routes = installRoutes({
      home: ctx.hostOptions.home,
      id: ctx.hostOptions.device.id,
      name: ctx.hostOptions.device.name,
      installs,
      build,
      remotes: ctx.hostRemotes,
    })
    for (const [path, route] of routes) ctx.effect(() => ctx.hostHttp.route(path, route))
    for (const setup of installRequests(ctx.hub, installs)) ctx.effect(setup)
  },
})
