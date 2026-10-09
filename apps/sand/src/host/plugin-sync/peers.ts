import { errorMessage } from '@sand/kit'
import type { PluginManifest, RemoteRecord } from '@sand/protocol'
import { PeerError } from './link/call'
import { parseManifest } from './state/parse'
import type { SyncStore } from './state/store'
import type { PeerLink } from './types'

export interface KnownPeer {
  name: string
  manifest: PluginManifest
}

interface PeerRounds {
  link: PeerLink
  store: SyncStore
  manifest(): PluginManifest
  recompute(): Promise<void>
  stopped(): boolean
}

type PeerState = PeerError['state'] | 'ok'

const createStatus = () => {
  const states = new Map<string, PeerState>()
  return (record: RemoteRecord, error?: unknown) => {
    const state: PeerState = error ? (error instanceof PeerError ? error.state : 'failed') : 'ok'
    const previous = states.get(record.id)
    if (previous === state) return
    states.set(record.id, state)
    if (error instanceof PeerError) console.error(`plugin sync: ${error.message}`)
    else if (error) console.error(`plugin sync: ${record.name} could not share plugins: ${errorMessage(error)}`)
    else if (previous) console.error(`plugin sync: ${record.name} is back in sync`)
  }
}

export const createPeerRounds = ({ link, store, manifest, recompute, stopped }: PeerRounds) => {
  const known = new Map<string, KnownPeer>()
  const report = createStatus()
  let current: Promise<void> | undefined
  let next: Promise<void> | undefined

  const exchange = async (record: RemoteRecord) => {
    try {
      const answer = parseManifest(await link.call(record, { type: 'plugins.exchange', manifest: manifest() }))
      if (answer.device !== record.id) throw new Error('it answered for a different PC')
      if (stopped()) return
      known.set(record.id, { name: record.name, manifest: answer })
      report(record)
    } catch (error) {
      if (!stopped()) report(record, error)
    }
  }

  const once = async () => {
    const records = await link.list()
    if (stopped()) return
    const ids = records.map(record => record.id)
    await store.forget(ids)
    for (const id of known.keys()) if (!ids.includes(id)) known.delete(id)
    await Promise.all(records.map(exchange))
    if (!stopped()) await recompute()
  }

  const safely = () => once().catch(error => console.error(`plugin sync: ${errorMessage(error)}`))

  const round = (): Promise<void> => {
    if (stopped()) return Promise.resolve()
    if (!current) {
      current = safely().finally(() => {
        current = undefined
      })
      return current
    }
    next ??= current.then(() => {
      next = undefined
      return round()
    })
    return next
  }

  const heard = (claimed: PluginManifest) => {
    const peer = known.get(claimed.device)
    if (peer && JSON.stringify(peer.manifest) === JSON.stringify(claimed)) return
    void round()
  }

  return { known, round, heard }
}
