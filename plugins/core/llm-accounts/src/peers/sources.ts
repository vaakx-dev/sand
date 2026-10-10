import type { ModelInfo } from '../contract'
import type { Accounts } from '../auth/accounts'
import { billings, kindOrder } from '../auth/kinds'
import type { SourceMeta } from '../catalog/types'
import type { Peers } from './peers'

export interface RemoteSource {
  meta: SourceMeta
  models: ModelInfo[]
}

export const remoteIds = (peers: Peers, accounts: Accounts) => {
  const ids = peers.list().flatMap(peer => (peer.info?.accounts ?? []).map(found => found.id))
  return [...new Set(ids)].filter(id => !accounts.signedIn(id) && peers.source(id))
}

const sourceOf = (peers: Peers, id: string): RemoteSource | undefined => {
  const peer = peers.source(id)
  const account = peer && peers.account(peer, id)
  if (!peer || !account) return undefined
  const via = peer.pc.name
  const meta: SourceMeta = {
    id,
    kind: account.kind,
    label: account.label,
    provider: account.provider,
    billing: billings[account.kind] ?? 'api',
    ...(account.plan && { plan: account.plan }),
    via,
    online: peer.online && !peer.refused,
  }
  const models = (peer.info?.models ?? []).filter(model => model.source === id).map(model => ({ ...model, via }))
  return { meta, models }
}

const rank = (source: RemoteSource) => {
  const index = kindOrder.indexOf(source.meta.kind)
  return index < 0 ? kindOrder.length : index
}

export const remoteSources = (peers: Peers, accounts: Accounts): RemoteSource[] =>
  remoteIds(peers, accounts)
    .flatMap(id => sourceOf(peers, id) ?? [])
    .sort((a, b) => rank(a) - rank(b))
