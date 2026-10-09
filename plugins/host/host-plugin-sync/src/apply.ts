import type { VersionSource } from '@sand/host-plugin-versions/contract'
import type { RemoteRecord } from '@sand/host-remotes/contract'
import { installDependencies } from '@sand/kit/host'
import { join } from 'node:path'
import { removePlugin } from './apply/remove'
import { writePlugin } from './apply/write'
import type { PluginOffer, PluginSyncState } from './contract'
import { parseFiles } from './state/parse'
import type { PeerLink } from './types'

interface Applier {
  root: string
  work: string
  link: PeerLink
  offers(): PluginOffer[]
  refresh(): Promise<void>
  swap(): Promise<boolean>
  state(): PluginSyncState
  snapshot?(source: VersionSource, plugins: string[]): Promise<void>
}

const filesTimeout = 120_000

const fetchPlugin = async (link: PeerLink, record: RemoteRecord | undefined, offer: PluginOffer) => {
  if (!record) throw new Error(`${offer.peerName} is no longer paired with this PC`)
  const files = parseFiles(await link.call(record, { type: 'plugins.files', plugin: offer.plugin }, filesTimeout))
  if (files.plugin !== offer.plugin || files.hash !== offer.hash) throw new Error(`${offer.plugin} changed again on ${offer.peerName}; try again`)
  return files
}

export const createApplier = ({ root, work, link, offers, refresh, swap, state, snapshot }: Applier) => {
  let queue: Promise<unknown> = Promise.resolve()
  const versionsOf = (source: VersionSource, plugins: string[]) => snapshot?.(source, plugins).catch(() => {})

  const run = async (peer: string, plugins: string[]) => {
    const record = (await link.list()).find(item => item.id === peer)
    let applied = false
    let failure: unknown
    await versionsOf('edit', plugins)
    try {
      for (const plugin of plugins) {
        const offer = offers().find(item => item.peer === peer && item.plugin === plugin)
        if (!offer) throw new Error('That change is no longer offered')
        if (offer.kind === 'removed') {
          await removePlugin(root, work, plugin)
          applied = true
          continue
        }
        const files = await fetchPlugin(link, record, offer)
        await writePlugin(root, work, files)
        applied = true
        await installDependencies(join(root, plugin))
      }
    } catch (error) {
      failure = error
    }
    if (applied) await versionsOf('sync', plugins)
    await refresh()
    if (applied) {
      const swapped = swap()
      if (failure) await swapped.catch(() => false)
      else await swapped
    }
    if (failure) throw failure
    return state()
  }

  return (peer: string, plugins: string[]): Promise<PluginSyncState> => {
    const next = queue.then(() => run(peer, plugins))
    queue = next.catch(() => {})
    return next
  }
}
