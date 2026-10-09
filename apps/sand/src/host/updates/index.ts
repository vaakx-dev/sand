import type { HostHealthCheck } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { writeShim } from '../../commands/install/shim'
import { readInfo } from '../../daemon/info'
import { buildInfo } from '../dist/build'
import { restorePrevious, switchTo } from '../dist/layout'
import { appRoot } from '../dist/root'
import { downloadRelease, findRelease } from '../github'
import { askHealth } from './health/ask'
import { waitHealthy } from './health/wait'
import { hostCodeChanged } from './host-code'
import { checkLoads } from './install/check'
import { cleanupBuilds } from './install/cleanup'
import { prepareBuild } from './install/prepare'
import { repairRequests } from './repair/requests'
import { updateRequests } from './requests'
import { loadStore } from './store'
import { createUpdater } from './updater'

const requireInfo = async (home: string) => {
  const info = await readInfo(home)
  if (!info) throw new Error(`sand could not read ${join(home, 'server.json')}`)
  return info
}

export const updatesPlugin = definePlugin({
  name: 'updates',
  description: 'Checks GitHub for newer sand releases and installs them when you ask',
  inject: ['hostOptions', 'hostApp', 'runtimes', 'hub'],
  async apply(ctx) {
    const { home, main, drainTimeout, device } = ctx.hostOptions
    let hostHealth: HostHealthCheck | undefined
    ctx.watch('hostHealth', impl => {
      hostHealth = impl
    })
    const readHealth = async () => (hostHealth ? hostHealth.check() : askHealth(await requireInfo(home)))
    const store = await loadStore(home)
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
