import type { VersionSource } from '@sand/host-plugin-versions/contract'
import { installDependencies } from '@sand/host-plugin-library/files'
import { serial } from '@sand/util'
import { join } from 'node:path'
import { pluginsFiles, type PluginOffer, type PluginSyncState } from '../contract'
import { parseFiles } from '../state/parse'
import type { PeerLink, PeerPc } from '../types'
import { removePlugin } from './remove'
import { writePlugin } from './write'

interface Applier {
  root: string
  work: string
  link: PeerLink
  offers(): PluginOffer[]
  refresh(): Promise<void>
  swap(): Promise<boolean>
  state(): PluginSyncState
  snapshot(source: VersionSource, plugins: string[]): Promise<void>
}

const filesTimeout = 120_000

const fetchPlugin = async (link: PeerLink, record: PeerPc | undefined, offer: PluginOffer) => {
  if (!record) throw new Error(`${offer.peerName} is no longer paired with this PC`)
  const files = parseFiles(await link.call(record, pluginsFiles, { plugin: offer.plugin }, filesTimeout))
  if (files.plugin !== offer.plugin || files.hash !== offer.hash) throw new Error(`${offer.plugin} changed again on ${offer.peerName}; try again`)
  return files
}

export const createApplier = ({ root, work, link, offers, refresh, swap, state, snapshot }: Applier) => {
  const queue = serial()

  const run = async (peer: string, plugins: string[]) => {
    const record = link.list().find(item => item.id === peer)
    let applied = false
    let failure: unknown
    await snapshot('edit', plugins)
    try {
      for (const plugin of plugins) {
        const offer = offers().find(item => item.peer === peer && item.plugin === plugin)
        if (!offer) throw new Error('That change is no longer offered')
        if (offer.kind === 'removed') {
          await removePlugin(root, work, plugin)
          applied = true
          continue
        }
        await writePlugin(root, work, await fetchPlugin(link, record, offer))
        applied = true
        await installDependencies(join(root, plugin))
      }
    } catch (error) {
      failure = error
    }
    if (applied) await snapshot('sync', plugins)
    await refresh()
    if (applied && failure) await swap().catch(() => false)
    else if (applied) await swap()
    if (failure) throw failure
    return state()
  }

  return (peer: string, plugins: string[]): Promise<PluginSyncState> => queue(() => run(peer, plugins))
}
