import { hostPaths } from '@sand/kit'
import { buildInfo } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import type { HostBuild } from './contract'
import { doneRoute, failRoute, stepRoute } from './install/finish'
import { pairRoute } from './install/pair'
import { pluginsRoute } from './install/plugins'
import { createInstallKeys } from './installs'

export default definePlugin({
  name: 'host-dist',
  description: 'The build id of this sand, and the Add a PC links that pair a new PC and copy its plugins',
  inject: ['hostApp', 'hostOptions', 'hostHttp', 'hub', 'hostRemotes'],
  uses: { hostPluginSync: 'a new PC gets no plugins from this one' },
  apply(ctx) {
    const { home, device } = ctx.hostOptions
    const build: HostBuild = { info: () => buildInfo(ctx.hostApp.root()) }
    ctx.provide('hostBuild', build)
    const installs = createInstallKeys(progress => ctx.hub.broadcast({ name: 'install.progress', args: [progress] }))
    const shared = async () => (await ctx.hostPluginSync?.shared()) ?? []
    const routes = [
      [hostPaths.installPlugins, pluginsRoute({ home, installs, shared })],
      [hostPaths.installPair, pairRoute({ installs, remotes: ctx.hostRemotes, id: device.id, name: device.name })],
      [hostPaths.installStep, stepRoute(installs)],
      [hostPaths.installDone, doneRoute(installs)],
      [hostPaths.installFail, failRoute(installs)],
    ] as const
    for (const [path, route] of routes) ctx.effect(() => ctx.hostHttp.route(path, route))
    ctx.effect(() => ctx.hub.handle('install.create', () => installs.issue()))
    ctx.effect(() => ctx.hub.handle('install.cancel', ({ install }) => installs.cancel(install)))
  },
})
