import { peers, thisPc } from '@sand/devices-contract'
import { hostApp, hostOptions, hostRestart } from '@sand/host-daemon/contract'
import { buildInfo } from '@sand/host-dist/build'
import { writeShim } from '@sand/host-dist/setup'
import { hostHealth } from '@sand/host-health/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { appRoot, restorePrevious, switchTo, waitHealthy } from '@sand/util/boot'
import { definePlugin } from 'drydock'
import { announcer } from './announce'
import { updatesChange } from './contract'
import { downloadRelease } from './github/download'
import { findRelease } from './github/release'
import { hostCodeChanged } from './host-code'
import { checkLoads } from './install/check'
import { cleanupBuilds } from './install/cleanup'
import { prepareBuild } from './install/prepare'
import { repairRequests } from './repair/requests'
import { updateRequests } from './requests'
import { loadUpdateStore } from './store'
import { createUpdater } from './updater'

export default definePlugin({
  name: 'host-updates',
  description: 'Checks GitHub for newer sand releases and installs them when you ask',
  inject: { hostOptions, hostApp, runtimes, hub },
  async apply(ctx) {
    const { home, main, drainTimeout } = ctx.hostOptions
    const readHealth = async () => {
      const health = ctx.get(hostHealth)
      if (!health) throw new Error('the host health check is not loaded')
      return health.check()
    }
    const store = await loadUpdateStore(home)
    const updater = createUpdater(
      {
        home,
        hostRoot: appRoot(main),
        app: ctx.hostApp,
        runtimes: ctx.runtimes,
        drainTimeout,
        current: () => buildInfo(ctx.hostApp.root()),
        find: findRelease,
        download: downloadRelease,
        prepare: (bytes, force) => prepareBuild(home, bytes, force),
        checkLoads,
        hostChanged: hostCodeChanged,
        switchTo: id => switchTo(home, id),
        refreshShim: () => writeShim(home),
        restorePrevious: () => restorePrevious(home),
        health: () => waitHealthy(readHealth),
        cleanup: keep => cleanupBuilds(home, keep),
        restart: () => ctx.emit(hostRestart),
        changed: state => ctx.hub.broadcast(updatesChange, state),
        announce: announcer(() => ctx.get(peers)),
      },
      store,
    )
    for (const setup of updateRequests(ctx.hub, updater)) ctx.effect(setup)
    for (const setup of repairRequests(ctx.hub, { self: () => ctx.get(thisPc)?.id, peers: () => ctx.get(peers) })) ctx.effect(setup)
    ctx.effect(() => {
      updater.start()
      return updater.stop
    })
  },
})
