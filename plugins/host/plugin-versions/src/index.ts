import { hostOptions } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { errorMessage } from '@sand/util'
import { definePlugin } from 'drydock'
import { hostVersions, versionsChange, versionsList, versionsRestore, type HostVersions } from './contract'
import { createVersionStore } from './store'
import { watchTargets } from './watch'

const report = (error: unknown) => console.error(`plugin versions: ${errorMessage(error)}`)

export default definePlugin({
  name: 'host-plugin-versions',
  description: 'Keeps past versions of your plugins, and brings back the last one that started',
  inject: { hostOptions, hub, runtimes },
  async apply(ctx) {
    const { home } = ctx.hostOptions
    let shown = ''
    const store = await createVersionStore(home, () => void broadcast().catch(report))
    const broadcast = async () => {
      const targets = await store.list()
      const text = JSON.stringify(targets)
      if (text === shown) return
      shown = text
      ctx.hub.broadcast(versionsChange, targets)
    }
    const versions: HostVersions = {
      ...store,
      async restore(target, version) {
        const next = await store.restore(target, version)
        void ctx.runtimes.swap('plugins')
        return next
      },
    }
    ctx.provide(hostVersions, versions)
    ctx.effect(() => ctx.hub.handle(versionsList, () => versions.list()))
    ctx.effect(() => ctx.hub.handle(versionsRestore, ({ target, version }) => versions.restore(target, version)))
    ctx.effect(() => watchTargets(home, () => void versions.snapshot('edit').catch(report)))
    void versions.snapshot('start').catch(report)
  },
})
