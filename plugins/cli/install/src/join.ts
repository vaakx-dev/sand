import { pairJoin, peersList, type PeerView } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'
import { firewallHint } from '@sand/host-dist/setup'
import type { JoinGrant } from './remote'

const joinTimeout = 60_000
const reachWait = 60_000
const pause = 1000

export interface JoinedPc {
  id: string
  name: string
}

const causeOf = (view?: PeerView) => {
  if (view?.status.phase === 'reconnecting') return `: ${view.status.cause}`
  if (view?.status.phase === 'blocked') return `: ${view.status.reason}`
  return ''
}

const hint = () => (process.platform === 'win32' ? ` ${firewallHint}` : '')

const waitUntilConnected = async (daemon: Daemon, pc: JoinedPc) => {
  const until = Date.now() + reachWait
  for (;;) {
    const view = (await daemon.request(peersList, {})).find(peer => peer.id === pc.id)
    if (view?.status.phase === 'connected') return
    if (Date.now() > until) throw new Error(`${pc.name} let this PC in, but this PC can't reach it${causeOf(view)}.${hint()}`)
    await Bun.sleep(pause)
  }
}

export const joinOtherPc = async (daemon: Daemon, grant: JoinGrant): Promise<JoinedPc> => {
  const join = await daemon.request(pairJoin, { url: grant.link }, { timeout: joinTimeout })
  const pc = { id: join.pc, name: join.name }
  await waitUntilConnected(daemon, pc)
  return pc
}
