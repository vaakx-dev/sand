import { type PluginScan, scanPlugins } from '@sand/host-plugin-library/files'
import { serial } from '@sand/util'
import { join } from 'node:path'
import { createApplier } from './apply/applier'
import type { PluginManifest, PluginOffer } from './contract'
import { createPeerRounds } from './peers/rounds'
import { readPlugin } from './scan/read'
import { diffManifests } from './state/offers'
import { parseManifest } from './state/parse'
import { syncStore } from './state/store'
import { syncView } from './state/view'
import type { PluginSync, PluginSyncOptions } from './types'

export const createPluginSync = async (options: PluginSyncOptions): Promise<PluginSync> => {
  const { home, self, link } = options
  const root = join(home, 'plugins')
  const work = join(home, 'plugin-sync')
  const store = await syncStore(home)
  let scan: PluginScan = await scanPlugins(root)
  let offers: PluginOffer[] = []
  let shown = ''
  let stopped = false
  const queue = serial()

  const localSet = () => new Set([...store.local(), ...scan.linked])

  const manifest = (): PluginManifest => {
    const local = localSet()
    const plugins = Object.fromEntries(Object.entries(scan.trees).filter(([name]) => !local.has(name)))
    return { device: self, plugins, local: [...local] }
  }

  const view = () => syncView(scan.trees, localSet(), offers)

  const compute = async () => {
    const ours = manifest()
    const local = localSet()
    const next: PluginOffer[] = []
    for (const [id, peer] of peers.known) {
      const { bases, skipped } = store.get()
      const result = diffManifests({
        peer: { id, name: peer.name },
        mine: ours,
        theirs: peer.manifest,
        bases: bases[id] ?? {},
        skipped: skipped[id] ?? {},
        local,
      })
      await store.settle(id, result.bases, result.skipped)
      next.push(...result.offers)
    }
    offers = next
    const state = view()
    const json = JSON.stringify(state)
    if (json === shown) return
    shown = json
    if (!stopped) options.changed(state)
  }

  const recompute = () => queue(compute)

  const peers = createPeerRounds({ link, store, manifest, recompute, stopped: () => stopped })

  const rescan = async () => {
    if (stopped) return
    const before = JSON.stringify(manifest())
    scan = await scanPlugins(root)
    await recompute()
    if (JSON.stringify(manifest()) !== before) void peers.round()
  }

  const apply = createApplier({ root, work, link, offers: () => offers, refresh: rescan, swap: options.swap, state: view, snapshot: options.snapshot })

  return {
    state: () => queue(async () => view()),
    async exchange(value, from) {
      const claimed = parseManifest(value)
      if (claimed.device !== from) throw new Error('That plugin list belongs to a different PC')
      const paired = link.list().some(item => item.id === claimed.device)
      if (paired && !stopped) peers.heard(claimed)
      return manifest()
    },
    async files(plugin) {
      if (localSet().has(plugin)) throw new Error('That plugin is kept on this PC only')
      return readPlugin(root, plugin)
    },
    apply,
    async skip(peer, plugins) {
      const entries = Object.fromEntries(
        offers.filter(offer => offer.peer === peer && plugins.includes(offer.plugin)).map(offer => [offer.plugin, offer.hash]),
      )
      await store.skip(peer, entries)
      await recompute()
      return view()
    },
    async setLocal(plugin, local) {
      if (!local && scan.linked.has(plugin)) throw new Error(`${plugin} is a linked folder, so it stays on this PC only`)
      await store.setLocal(plugin, local)
      scan = await scanPlugins(root)
      await recompute()
      void peers.round()
      return view()
    },
    rescan,
    round: peers.round,
    stop() {
      stopped = true
    },
  }
}
