import type { LoginPc, LoginRemoteAccount, LoginState } from './contract'
import type { Accounts } from './auth/accounts'
import type { Peers, PeerState } from './peers/peers'
import type { ShareUsers } from './share/users'

const pcOf = (peer: PeerState): LoginPc => ({
  device: peer.pc.id,
  name: peer.pc.name,
  online: peer.online,
  checked: peer.checked,
  shares: (peer.info?.accounts ?? []).map(account => account.label),
  ...(peer.error && { error: peer.error }),
})

const remoteAccounts = (peers: Peers, accounts: Accounts): LoginRemoteAccount[] =>
  peers.list().flatMap(peer =>
    (peer.info?.accounts ?? []).map(({ id, kind, provider, label, method, plan }) => ({
      id,
      kind,
      provider,
      label,
      method,
      ...(plan && { plan }),
      device: peer.pc.id,
      pc: peer.pc.name,
      online: peer.online && !peer.refused,
      inUse: kind === 'server' ? !peer.refused : !accounts.signedIn(id) && peers.source(id)?.pc.id === peer.pc.id,
    })),
  )

export const loginState = (accounts: Accounts, peers: Peers, users: ShareUsers): LoginState => ({
  accounts: accounts.list(),
  remote: remoteAccounts(peers, accounts),
  pcs: peers.list().map(pcOf),
  usedBy: users.list(),
})
