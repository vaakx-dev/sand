import { appRoot, switchTo, waitHealthy } from '@sand/boot'
import { buildInfo, ensureRipgrep } from '@sand/boot/build'
import { errorMessage } from '@sand/util'
import { writeShim } from '@sand/boot/setup'
import { clearUpdateNotice } from '@sand/boot/notice'
import { loadUpdateStore } from '@sand/boot/updates'
import { peers, thisPc } from '@sand/devices-contract'
import { hostApp, hostOptions, hostRestart } from '@sand/host-daemon/contract'
import { hostHealth } from '@sand/host-health/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { databaseFile, readUpgrade } from '@sand/ledger/contract'
import { definePlugin } from 'drydock'
import { announcer } from './announce'
import { buildAddons, updatesChange } from './contract'
import { downloadRelease } from './github/download'
import { findRelease } from './github/release'
import { hostCodeChanged } from './host-code'
import { homeNotices, setAsideIds } from './notices'
import { checkLoads } from './install/check'
import { cleanupBuilds } from './install/cleanup'
import { prepareBuild } from './install/prepare'
import { repairRequests } from './repair/requests'
import { updateRequests } from './requests'
import { createUpdater } from './updater'

export default definePlugin({
  name: 'host-updates',
  description: 'Checks GitHub for newer sand releases and installs them when you ask',
  inject: { hostOptions, hostApp, runtimes, hub },
  async apply(ctx) {
    const { hostOptions, hostApp, runtimes, hub } = ctx
    const { home, main } = hostOptions
    const readHealth = async () => {
      const health = ctx.get(hostHealth)
      if (!health) throw new Error('the host health check is not loaded')
      return health.check()
    }
    void ensureRipgrep(hostApp.root()).catch(error => console.warn(`sand could not get its ripgrep: ${errorMessage(error)}`))
    const store = await loadUpdateStore(home)
    const updater = createUpdater(
      {
        home,
        hostRoot: appRoot(main),
        app: hostApp,
        runtimes,
        current: () => buildInfo(hostApp.root()),
        find: findRelease,
        download: downloadRelease,
        prepare: (bytes, force) => prepareBuild(home, bytes, force),
        checkLoads,
        addons: () => ctx.get(buildAddons),
        upgrade: () => readUpgrade(databaseFile(home)),
        notices: {
          read: dismissed => homeNotices(home, dismissed),
          clearUpdate: () => clearUpdateNotice(home),
          setAside: () => setAsideIds(home),
        },
        hostChanged: hostCodeChanged,
        switchTo: id => switchTo(home, id),
        refreshShim: () => writeShim(home),
        health: () => waitHealthy(readHealth),
        cleanup: keep => cleanupBuilds(home, keep),
        restart: () => ctx.emit(hostRestart),
        changed: state => hub.broadcast(updatesChange, state),
        announce: announcer(() => ctx.get(peers)),
      },
      store,
    )
    for (const setup of updateRequests(hub, updater, () => ctx.get(peers))) ctx.effect(setup)
    for (const setup of repairRequests(hub, { self: () => ctx.get(thisPc)?.id, peers: () => ctx.get(peers) })) ctx.effect(setup)
    ctx.effect(() => {
      updater.start()
      return updater.stop
    })
  },
})
