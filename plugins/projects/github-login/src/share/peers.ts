import { bearer, trimSlash } from '@sand/kit'
import { peerUrl, remoteStore, type RemoteStore } from '@sand/kit/host'
import { recordOf, timeOf } from '../store'
import { sharePath, type ShareSide } from './route'

type RemoteRecord = ReturnType<RemoteStore['list']>[number]

const requestWait = 8_000

const syncOne = async (remote: RemoteRecord, side: ShareSide) => {
  const base = trimSlash(await peerUrl(remote))
  const headers = bearer(remote.key)
  const response = await fetch(`${base}${sharePath}`, { headers, signal: AbortSignal.timeout(requestWait) })
  if (!response.ok) return
  const theirs = recordOf(await response.json().catch(() => undefined))
  const mine = side.shared()
  if (theirs && timeOf(theirs) > timeOf(mine)) return side.receive(theirs, { id: remote.id, name: remote.name })
  if (!mine || timeOf(mine) <= timeOf(theirs)) return
  await fetch(`${base}${sharePath}`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(mine),
    signal: AbortSignal.timeout(requestWait),
  })
}

export const pairedPcs = async (home: string) => (await remoteStore(home)).list()

export const syncPeers = async (home: string, side: ShareSide) => {
  const remotes = await pairedPcs(home)
  await Promise.all(remotes.map(remote => syncOne(remote, side).catch(() => {})))
  return remotes.length
}
