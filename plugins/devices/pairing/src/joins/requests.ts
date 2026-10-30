import { type PairSettled, pairApprove, pairDecide, pairDeny, pairRelay, pairRequests } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { Decisions } from './decisions'

const outcomeText: Record<PairSettled['outcome'], string> = {
  approved: 'was already allowed',
  denied: 'was denied',
  expired: 'has expired',
}

export const joinRequests = (hub: Hub, decisions: Decisions): (() => Dispose)[] => [
  () => hub.handle(pairRequests, () => decisions.pending()),
  () =>
    hub.handle(pairApprove, async ({ id, pc }, caller) => {
      const settled = await decisions.decide(id, pc, 'approved', caller.device)
      if (settled.outcome !== 'approved' || !settled.device) throw new Error(`This request ${outcomeText[settled.outcome]}`)
      return settled.device
    }),
  () =>
    hub.handle(pairDeny, async ({ id, pc }, caller) => {
      await decisions.decide(id, pc, 'denied', caller.device)
    }),
  () => hub.handle(pairRelay, (relay, caller) => decisions.receive(relay, caller.device)),
  () => hub.handle(pairDecide, ({ id, outcome, by }) => decisions.decideHere(id, outcome, by)),
]
