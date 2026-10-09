import type { PluginOffer, PluginSyncState, RemoteRecord } from '@sand/protocol'
import { join } from 'node:path'
import { installDependencies } from './apply/install'
import { removePlugin } from './apply/remove'
import { writePlugin } from './apply/write'
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
}

const filesTimeout = 120_000

const fetchPlugin = async (link: PeerLink, record: RemoteRecord | undefined, offer: PluginOffer) => {
  if (!record) throw new Error(`${offer.peerName} is no longer paired with this PC`)
  const files = parseFiles(await link.call(record, { type: 'plugins.files', plugin: offer.plugin }, filesTimeout))
  if (files.plugin !== offer.plugin || files.hash !== offer.hash) throw new Error(`${offer.plugin} changed again on ${offer.peerName}; try again`)
  return files
}

export const createApplier = ({ root, work, link, offers, refresh, swap, state }: Applier) => {
  let queue: Promise<unknown> = Promise.resolve()

  const run = async (peer: string, plugins: string[]) => {
    const record = (await link.list()).find(item => item.id === peer)
    let applied = false
    let failure: unknown
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
