import { errorMessage } from '@sand/kit'
import { definePlugin } from 'drydock'
import type { HostVersions } from './contract'
import { createVersionStore } from './store'
import { watchTargets } from './watch'

const field = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !value) throw new Error(`${name} is required`)
  return value
}

const report = (error: unknown) => console.error(`plugin versions: ${errorMessage(error)}`)

export default definePlugin({
  name: 'host-plugin-versions',
  description: 'Keeps past versions of your plugins, hook files and default loop, and brings back the last one that started',
  inject: ['hostOptions', 'hub', 'runtimes'],
  async apply(ctx) {
    const { home } = ctx.hostOptions
    let shown = ''
    const store = await createVersionStore(home, () => void broadcast().catch(report))
    const broadcast = async () => {
      const targets = await store.list()
      const text = JSON.stringify(targets)
      if (text === shown) return
      shown = text
      ctx.hub.broadcast({ name: 'versions.change', args: [targets] })
    }
    const versions: HostVersions = {
      list: store.list,
      snapshot: store.snapshot,
      async restore(target, version) {
        const next = await store.restore(target, version)
        void ctx.runtimes.swap('plugins')
        return next
      },
      markGood: store.markGood,
      autoRestore: store.autoRestore,
    }
    ctx.provide('hostVersions', versions)
    ctx.effect(() => ctx.hub.handle('versions.list', () => versions.list()))
    ctx.effect(() =>
      ctx.hub.handle('versions.restore', ({ target, version }) => versions.restore(field(target, 'target'), field(version, 'version'))),
    )
    ctx.effect(() => watchTargets(home, () => void versions.snapshot('edit').catch(report)))
    void versions.snapshot('start').catch(report)
  },
})
