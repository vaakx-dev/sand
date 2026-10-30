import { peers, thisPc } from '@sand/devices-contract'
import { hostOptions } from '@sand/host-daemon/contract'
import { hub } from '@sand/host-hub/contract'
import { hostVersions } from '@sand/host-plugin-versions/contract'
import { runtimes } from '@sand/host-runtimes/contract'
import { debouncedWatch } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { hostPluginSync, pluginsChange } from './contract'
import { createLink } from './peers/link'
import { pluginRequests } from './requests'
import { createPluginSync } from './service'
import { sharedPlugins } from './state/shared'

const settle = 1000
const every = 120_000

export default definePlugin({
  name: 'host-plugin-sync',
  description: 'Shares ~/.sand/plugins with paired PCs, asking before applying changes',
  inject: { hostOptions, hub, runtimes, peers, thisPc },
  async apply(ctx) {
    const { home } = ctx.hostOptions
    const root = join(home, 'plugins')
    await mkdir(root, { recursive: true })
    ctx.provide(hostPluginSync, { shared: () => sharedPlugins(home) })
    const sync = await createPluginSync({
      home,
      self: ctx.thisPc.id,
      link: createLink(ctx.peers),
      swap: () => ctx.runtimes.swap('plugins'),
      changed: state => ctx.hub.broadcast(pluginsChange, state),
      snapshot: async (source, plugins) => {
        const keys = plugins.map(plugin => `plugins/${plugin}`)
        await ctx.get(hostVersions)?.snapshot(source, keys).catch(error => ctx.report(error))
      },
    })
    for (const setup of pluginRequests(ctx.hub, sync)) ctx.effect(setup)
    ctx.effect(() => debouncedWatch(root, { recursive: true }, () => void sync.rescan(), settle))
    ctx.effect(() => ctx.peers.onOpen(() => void sync.round()))
    ctx.effect(() => {
      const interval = setInterval(() => void sync.round(), every)
      return () => clearInterval(interval)
    })
    ctx.effect(() => () => sync.stop())
    void sync.round()
  },
})
