import type { LoginPc, LoginRemoteAccount, LoginState } from './contract'
import type { Accounts } from './auth/accounts'
import { heldKey } from './contract/pool'
import type { Peers, PeerState } from './peers/peers'
import { remoteSources } from './peers/sources'
import type { ShareUsers } from './share/users'

const pcOf = (peer: PeerState): LoginPc => ({
  device: peer.pc.id,
  name: peer.pc.name,
  online: peer.online,
  checked: peer.checked,
  shares: (peer.info?.accounts ?? []).map(account => account.label),
  ...(peer.error && { error: peer.error }),
})

const remoteAccounts = (peers: Peers, accounts: Accounts): LoginRemoteAccount[] => {
  const used = new Set(remoteSources(peers, accounts).map(({ meta }) => heldKey(meta.account, meta.pc)))
  return peers.list().flatMap(peer =>
    (peer.info?.accounts ?? []).map(({ id, kind, provider, label, method, plan, email }) => ({
      id,
      kind,
      provider,
      label,
      method,
      ...(plan && { plan }),
      ...(email && { email }),
      device: peer.pc.id,
      pc: peer.pc.name,
      online: peer.online && !peer.refused,
      inUse: used.has(heldKey(id, peer.pc.id)),
    })),
  )
}

export const loginState = (accounts: Accounts, peers: Peers, users: ShareUsers): LoginState => ({
  accounts: accounts.list(),
  remote: remoteAccounts(peers, accounts),
  pcs: peers.list().map(pcOf),
  usedBy: users.list(),
})
