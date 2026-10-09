import { debouncedWatch } from '@sand/kit/fs'
import { watchRemotes } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createLink } from './link/peers'
import { pluginRequests } from './requests'
import { createPluginSync } from './service'
import { sharedPlugins } from './state/shared'

const settle = 1000
const every = 120_000

export default definePlugin({
  name: 'host-plugin-sync',
  description: 'Shares ~/.sand/plugins with paired PCs, asking before applying changes',
  inject: ['hostOptions', 'hub', 'runtimes'],
  async apply(ctx) {
    const { home, device } = ctx.hostOptions
    const root = join(home, 'plugins')
    await mkdir(root, { recursive: true })
    ctx.provide('hostPluginSync', { shared: () => sharedPlugins(home) })
    const link = createLink(home)
    const sync = await createPluginSync({
      home,
      device,
      link,
      swap: () => ctx.runtimes.swap('plugins'),
      changed: state => ctx.hub.broadcast({ name: 'plugins.change', args: [state] }),
      snapshot: async (source, plugins) => ctx.hostVersions?.snapshot(source, plugins.map(plugin => `plugins/${plugin}`)),
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
