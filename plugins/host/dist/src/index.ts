import { hostApp, hostOptions } from '@sand/host-daemon/contract'
import { hostHttp } from '@sand/host-gateway/contract'
import { hub } from '@sand/host-hub/contract'
import { hostPluginSync } from '@sand/host-plugin-sync/contract'
import { hostRemotes } from '@sand/host-remotes/contract'
import { hostPaths } from '@sand/util/boot/wire'
import { definePlugin } from 'drydock'
import { buildInfo } from './build'
import { hostBuild, installCancel, installCreate, installProgress, type HostBuild } from './contract'
import { doneRoute, failRoute, stepRoute } from './install/finish'
import { pairRoute } from './install/pair'
import { pluginsRoute } from './install/plugins'
import { createInstallKeys } from './installs'

export default definePlugin({
  name: 'host-dist',
  description: 'The build id of this sand, and the Add a PC links that pair a new PC and copy its plugins',
  inject: { hostApp, hostOptions, hostHttp, hub, hostRemotes },
  apply(ctx) {
    const { home, device } = ctx.hostOptions
    const build: HostBuild = { info: () => buildInfo(ctx.hostApp.root()) }
    ctx.provide(hostBuild, build)
    build.info().catch(error => ctx.report(error))
    const installs = createInstallKeys(progress => ctx.hub.broadcast(installProgress, progress))
    const shared = async () => (await ctx.get(hostPluginSync)?.shared()) ?? []
    const routes = [
      [hostPaths.installPlugins, pluginsRoute({ home, installs, shared })],
      [hostPaths.installPair, pairRoute({ installs, remotes: ctx.hostRemotes, id: device.id, name: device.name })],
      [hostPaths.installStep, stepRoute(installs)],
      [hostPaths.installDone, doneRoute(installs)],
      [hostPaths.installFail, failRoute(installs)],
    ] as const
    for (const [path, route] of routes) ctx.effect(() => ctx.hostHttp.route(path, route))
    ctx.effect(() => ctx.hub.handle(installCreate, () => installs.issue()))
    ctx.effect(() => ctx.hub.handle(installCancel, ({ install }) => installs.cancel(install)))
  },
})
