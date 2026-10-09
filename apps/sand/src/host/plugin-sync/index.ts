import { debouncedWatch } from '@sand/host'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { watchRemotes } from '../projects/sync/watch'
import { createLink } from './link/peers'
import { pluginRequests } from './requests'
import { createPluginSync } from './service'

const settle = 1000
const every = 120_000

export const pluginSyncPlugin = definePlugin({
  name: 'plugin-sync',
  description: 'Shares ~/.sand/plugins with paired PCs, asking before applying changes',
  inject: ['hostOptions', 'hub', 'runtimes'],
  async apply(ctx) {
    const { home, device } = ctx.hostOptions
    const root = join(home, 'plugins')
    await mkdir(root, { recursive: true })
    const link = createLink(home)
    const sync = await createPluginSync({
      home,
      device,
      link,
      swap: () => ctx.runtimes.swap('plugins'),
      changed: state => ctx.hub.broadcast({ name: 'plugins.change', args: [state] }),
    })
    for (const setup of pluginRequests(ctx.hub, sync)) ctx.effect(setup)
    ctx.effect(() => debouncedWatch(root, { recursive: true }, () => void sync.rescan(), settle))
    ctx.effect(() => watchRemotes(home, () => void sync.round()))
    ctx.effect(() => {
      const interval = setInterval(() => void sync.round(), every)
      return () => {
        clearInterval(interval)
        sync.stop()
        link.stop()
      }
    })
    void sync.round()
  },
})
