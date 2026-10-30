import { pairCancelJoin, pairJoin, pairJoins } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import type { Outgoing } from './outgoing'

export const outgoingRequests = (hub: Hub, outgoing: Outgoing): (() => Dispose)[] => [
  () => hub.handle(pairJoin, ({ url, pc }, caller) => outgoing.join(url, pc, caller.device)),
  () => hub.handle(pairJoins, () => outgoing.list()),
  () => hub.handle(pairCancelJoin, ({ id }) => outgoing.cancel(id)),
]
