import {
  type JoinRequest,
  type PairSettled,
  type Peers,
  pairDecide,
  pairRelay,
  pairRequested,
  pairSettled,
  type Registry,
  type ThisPc,
} from '@sand/devices-contract'
import type { Hub, InputOf } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import type { Incoming } from './incoming'

export type Decision = 'approved' | 'denied'

interface DecisionsOptions {
  hub: Hub
  registry: Registry
  thisPc: Pick<ThisPc, 'id'>
  incoming: Incoming
  peers(): Peers | undefined
}

const relayFailed = (error: unknown) => console.error(`pairing could not tell your other PCs: ${errorMessage(error)}`)

export const createDecisions = ({ hub, registry, thisPc, incoming, peers }: DecisionsOptions) => {
  const remote = new Map<string, JoinRequest>()

  const share = (relay: InputOf<typeof pairRelay>) => {
    const linked = peers()
    if (!linked || !linked.connected().length) return
    linked.callEach(pairRelay, relay).catch(relayFailed)
  }

  const shareWith = (pc: string) => {
    const requests = incoming.pending()
    if (requests.length) peers()?.call(pc, pairRelay, { requests, settled: [] }).catch(relayFailed)
  }

  const announceRequest = (request: JoinRequest) => {
    hub.broadcast(pairRequested, request, 'user')
    share({ requests: [request], settled: [] })
  }

  const announceSettled = (settled: PairSettled) => {
    hub.broadcast(pairSettled, settled, 'user')
    share({ requests: [], settled: [settled] })
  }

  const forgetRemote = (settled: PairSettled) => {
    if (remote.delete(settled.id)) hub.broadcast(pairSettled, settled, 'user')
  }

  const decideHere = async (id: string, outcome: Decision, by: string): Promise<PairSettled> => {
    const entry = incoming.get(id)
    if (entry?.settled) return entry.settled
    if (!entry || !incoming.isPending(id)) return { id, pc: thisPc.id, outcome: 'expired' }
    const { kind, name, platform } = entry.request
    const device = outcome === 'approved' ? await registry.add({ kind, name, platform, publicKey: entry.publicKey }, by) : undefined
    if (entry.settled) return entry.settled
    const settled = incoming.settle(id, outcome, by, device)!
    announceSettled(settled)
    return settled
  }

  const decide = async (id: string, pc: string | undefined, outcome: Decision, by: string) => {
    const owner = pc ?? (incoming.get(id) ? thisPc.id : remote.get(id)?.pc)
    if (!owner) return { id, pc: thisPc.id, outcome: 'expired' } satisfies PairSettled
    if (owner === thisPc.id) return decideHere(id, outcome, by)
    const linked = peers()
    if (!linked) throw new Error("That PC isn't connected")
    const settled = await linked.call(owner, pairDecide, { id, outcome, by })
    forgetRemote(settled)
    return settled
  }

  const receive = ({ requests, settled }: InputOf<typeof pairRelay>, from: string) => {
    const now = Date.now()
    for (const request of requests) {
      if (request.pc !== from || request.expires <= now) continue
      const fresh = !remote.has(request.id)
      remote.set(request.id, request)
      if (fresh) hub.broadcast(pairRequested, request, 'user')
    }
    for (const done of settled) if (done.pc === from) forgetRemote(done)
  }

  const withdraw = (id: string) => {
    if (!incoming.isPending(id)) return
    const settled = incoming.settle(id, 'expired')
    if (settled) announceSettled(settled)
  }

  const settlePaired = () => {
    for (const request of incoming.pending()) {
      const entry = incoming.get(request.id)
      const device = entry && registry.byKey(entry.publicKey)
      if (!device || device.removed) continue
      const settled = incoming.settle(request.id, 'approved', device.addedBy, device)
      if (settled) announceSettled(settled)
    }
  }

  const sweep = () => {
    for (const settled of incoming.expire()) announceSettled(settled)
    const now = Date.now()
    for (const [id, request] of remote) if (request.expires <= now) forgetRemote({ id, pc: request.pc, outcome: 'expired' })
  }

  const pending = () => [...incoming.pending(), ...[...remote.values()].filter(request => request.expires > Date.now())]

  return { announceRequest, decide, decideHere, receive, shareWith, settlePaired, sweep, pending, withdraw }
}

export type Decisions = ReturnType<typeof createDecisions>
