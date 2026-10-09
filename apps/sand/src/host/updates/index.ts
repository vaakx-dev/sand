import type { HostHealthCheck } from '@sand/protocol'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { writeShim } from '../../commands/install/shim'
import { readInfo } from '../../daemon/info'
import { askHealth } from './health/ask'
import { waitHealthy } from './health/wait'
import { buildInfo } from '../dist/build'
import { appRoot } from '../dist/root'
import { hostCodeChanged } from './host-code'
import { checkLoads } from './install/check'
import { cleanupBuilds } from './install/cleanup'
import { prepareBuild } from './install/prepare'
import { repairRequests } from './repair/requests'
import { restorePrevious, switchTo } from '../dist/layout'
import { loadLater } from './later'
import { updateRequests } from './requests'
import { findSource, updateSources } from './sources'
import { newestUpdate } from './sources/newest'
import { createUpdater } from './updater'

const requireInfo = async (home: string) => {
  const info = await readInfo(home)
  if (!info) throw new Error(`sand could not read ${join(home, 'server.json')}`)
  return info
}

export const updatesPlugin = definePlugin({
  name: 'updates',
  description: 'Offers newer sand builds from your other PCs and installs them',
  inject: ['hostOptions', 'hostApp', 'runtimes', 'hub'],
  async apply(ctx) {
    const { home, main, drainTimeout, device } = ctx.hostOptions
    let hostHealth: HostHealthCheck | undefined
    ctx.watch('hostHealth', impl => {
      hostHealth = impl
    })
    const readHealth = async () => (hostHealth ? hostHealth.check() : askHealth(await requireInfo(home)))
    const current = () => buildInfo(ctx.hostApp.root())
    const later = await loadLater(home)
    const updater = createUpdater(
      {
        home,
        hostRoot: appRoot(main),
        app: ctx.hostApp,
        runtimes: ctx.runtimes,
        drainTimeout,
        current,
        find: async current => newestUpdate(await updateSources(home), current),
        source: id => findSource(home, id),
        prepare: (bytes, options) => prepareBuild(home, bytes, options),
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
      later,
    )
    for (const setup of updateRequests(ctx.hub, updater)) ctx.effect(setup)
    for (const setup of repairRequests(ctx.hub, { home, self: device, build: current, updater })) ctx.effect(setup)
    ctx.effect(() => {
      updater.start()
      return updater.stop
    })
  },
})
