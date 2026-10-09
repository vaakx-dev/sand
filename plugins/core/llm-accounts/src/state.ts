import type { LoginPc, LoginRemoteAccount, LoginState } from '@sand/protocol'
import { accountName, type Accounts } from './auth/accounts'
import { lacking } from './llm'
import type { Peers, PeerState } from './peers/peers'
import type { ShareUsers } from './share/users'

const pcOf = (peer: PeerState): LoginPc => ({
  device: peer.pc.id,
  name: peer.pc.name,
  online: peer.online,
  checked: peer.checked,
  shares: (peer.info?.accounts ?? []).map(account => accountName(account.provider, account.method)),
  ...(peer.error && { error: peer.error }),
})

const remoteAccounts = (peers: Peers, accounts: Accounts): LoginRemoteAccount[] => {
  const used = new Set(lacking(accounts).map(provider => peers.source(provider)?.pc.id && `${provider}:${peers.source(provider)!.pc.id}`))
  return peers.list().flatMap(peer =>
    (peer.info?.accounts ?? []).map(({ provider, label, subscription, method, plan }) => ({
      provider,
      label,
      subscription,
      method,
      ...(plan && { plan }),
      device: peer.pc.id,
      pc: peer.pc.name,
      online: peer.online && !peer.refused,
      inUse: used.has(`${provider}:${peer.pc.id}`),
    })),
  )
}

export const loginState = (accounts: Accounts, peers: Peers, users: ShareUsers): LoginState => ({
  accounts: accounts.list(),
  remote: remoteAccounts(peers, accounts),
  pcs: peers.list().map(pcOf),
  usedBy: users.list(),
})
