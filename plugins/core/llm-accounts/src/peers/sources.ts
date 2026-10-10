import type { ModelInfo, ModelPrice } from '../contract'
import type { Accounts } from '../auth/accounts'
import { billings, kindOrder } from '../auth/kinds'
import { qualify, split } from '../catalog/build'
import type { SourceMeta } from '../catalog/types'
import type { SharedAccount } from '../share/info'
import type { Peers, PeerState } from './peers'

export interface RemoteSource {
  meta: SourceMeta
  models: ModelInfo[]
  prices: Record<string, ModelPrice>
  account: string
  pc?: string
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const serverId = (account: string, peer: PeerState) => `${account}@${slug(peer.pc.name) || peer.pc.id}`

const nameOf = (model: ModelInfo) => model.name ?? split(model.id)?.name ?? model.id

const sourceOf = (peer: PeerState, account: SharedAccount, id: string, pinned: boolean): RemoteSource => {
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
  const offered = (peer.info?.models ?? []).filter(model => model.source === account.id)
  const prices = peer.info?.prices ?? {}
  const models = offered.map(model => ({ ...model, id: qualify(id, nameOf(model)), source: id, name: nameOf(model), via }))
  const priced = offered.flatMap((model, at) => (prices[model.id] ? [[models[at]!.id, prices[model.id]!] as const] : []))
  return { meta, models, prices: Object.fromEntries(priced), account: account.id, ...(pinned && { pc: peer.pc.id }) }
}

const logins = (peers: Peers, accounts: Accounts): RemoteSource[] => {
  const ids = peers.list().flatMap(peer => (peer.info?.accounts ?? []).filter(found => found.kind !== 'server').map(found => found.id))
  return [...new Set(ids)].flatMap(id => {
    const peer = accounts.signedIn(id) ? undefined : peers.source(id)
    const account = peer && peers.account(peer, id)
    return peer && account ? [sourceOf(peer, account, id, false)] : []
  })
}

const servers = (peers: Peers): RemoteSource[] =>
  peers
    .list()
    .filter(peer => !peer.refused)
    .flatMap(peer => (peer.info?.accounts ?? []).filter(found => found.kind === 'server').map(found => sourceOf(peer, found, serverId(found.id, peer), true)))

const rank = (source: RemoteSource) => {
  const index = kindOrder.indexOf(source.meta.kind)
  return index < 0 ? kindOrder.length : index
}

export const remoteSources = (peers: Peers, accounts: Accounts): RemoteSource[] =>
  [...logins(peers, accounts), ...servers(peers)].sort((a, b) => rank(a) - rank(b))
