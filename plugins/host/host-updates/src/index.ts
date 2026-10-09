import type { HostHealthCheck } from '@sand/host-health/contract'
import {
  appRoot,
  buildInfo,
  downloadRelease,
  findRelease,
  loadUpdateStore,
  restorePrevious,
  switchTo,
  waitHealthy,
  writeShim,
} from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { hostCodeChanged } from './host-code'
import { checkLoads } from './install/check'
import { cleanupBuilds } from './install/cleanup'
import { prepareBuild } from './install/prepare'
import { repairRequests } from './repair/requests'
import { updateRequests } from './requests'
import { createUpdater } from './updater'

export default definePlugin({
  name: 'host-updates',
  description: 'Checks GitHub for newer sand releases and installs them when you ask',
  inject: ['hostOptions', 'hostApp', 'runtimes', 'hub'],
  async apply(ctx) {
    const { home, main, drainTimeout, device } = ctx.hostOptions
    let hostHealth: HostHealthCheck | undefined
    ctx.watch('hostHealth', impl => {
      hostHealth = impl
    })
    const readHealth = async () => {
      if (!hostHealth) throw new Error('the host health check is not loaded')
      return hostHealth.check()
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
        restart: () => ctx.emit('host.restart'),
        changed: state => ctx.hub.broadcast({ name: 'updates.change', args: [state] }),
      },
      store,
    )
    for (const setup of updateRequests(ctx.hub, updater)) ctx.effect(setup)
    for (const setup of repairRequests(ctx.hub, { home, self: device })) ctx.effect(setup)
    ctx.effect(() => {
      updater.start()
      return updater.stop
    })
  },
})
