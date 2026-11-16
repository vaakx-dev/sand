import { type ModelInfo, type ModelPrice, sameSignIn, statelessCaps } from '../contract'
import type { Accounts } from '../auth/accounts'
import { billingOf, kindOrder } from '../auth/kinds'
import { qualify, split } from '../catalog/build'
import type { SourceMeta } from '../catalog/types'
import type { SharedAccount } from '../share/info'
import type { Peers, PeerState } from './peers'

interface RemoteSource {
  meta: SourceMeta & { account: string }
  models: ModelInfo[]
  prices: Record<string, ModelPrice>
  pc?: string
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const pinnedId = (account: string, peer: PeerState) => `${account}@${slug(peer.pc.name) || peer.pc.id}`

const boundToPc = (account: SharedAccount) => account.kind === 'server' || account.method === 'app'

const nameOf = (model: ModelInfo) => model.name ?? split(model.id)?.name ?? model.id

const sourceOf = (peer: PeerState, account: SharedAccount, id: string, pinned: boolean): RemoteSource => {
  const via = peer.pc.name
  const meta: RemoteSource['meta'] = {
    id,
    kind: account.kind,
    label: account.label,
    provider: account.provider,
    billing: billingOf(account.method),
    caps: account.caps ?? statelessCaps(),
    ...(account.plan && { plan: account.plan }),
    via,
    pc: peer.pc.id,
    account: account.id,
    online: peer.online && !peer.refused,
  }
  const offered = (peer.info?.models ?? []).filter(model => model.source === account.id)
  const prices = peer.info?.prices ?? {}
  const models = offered.map(model => ({ ...model, id: qualify(id, nameOf(model)), source: id, name: nameOf(model), via }))
  const priced = offered.flatMap((model, at) => (prices[model.id] ? [[models[at]!.id, prices[model.id]!] as const] : []))
  return { meta, models, prices: Object.fromEntries(priced), ...(pinned && { pc: peer.pc.id }) }
}

const logins = (peers: Peers, accounts: Accounts): RemoteSource[] => {
  const ids = peers.list().flatMap(peer => (peer.info?.accounts ?? []).filter(found => !boundToPc(found)).map(found => found.id))
  return [...new Set(ids)].flatMap(id => {
    const peer = accounts.signedIn(id) ? undefined : peers.source(id)
    const account = peer && peers.account(peer, id)
    return peer && account ? [sourceOf(peer, account, id, false)] : []
  })
}

const presence = (peer: PeerState) => (peer.online ? 0 : 1)

const pinned = (peers: Peers, accounts: Accounts): RemoteSource[] => {
  const own = accounts.list().filter(found => found.signedIn)
  const offered = peers
    .list()
    .filter(peer => !peer.refused)
    .sort((a, b) => presence(a) - presence(b))
    .flatMap(peer => (peer.info?.accounts ?? []).filter(boundToPc).map(account => ({ peer, account })))
  const twin = (account: SharedAccount, at: number) =>
    own.some(found => sameSignIn(found, account)) || offered.slice(0, at).some(earlier => sameSignIn(earlier.account, account))
  return offered.filter(({ account }, at) => !twin(account, at)).map(({ peer, account }) => sourceOf(peer, account, pinnedId(account.id, peer), true))
}

const rank = (source: RemoteSource) => {
  const index = kindOrder.indexOf(source.meta.kind)
  return index < 0 ? kindOrder.length : index
}

export const remoteSources = (peers: Peers, accounts: Accounts): RemoteSource[] =>
  [...logins(peers, accounts), ...pinned(peers, accounts)].sort((a, b) => rank(a) - rank(b))
