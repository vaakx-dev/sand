import { type Peers, peersListen, peersRelay, peersRelayCancel, peersRelayFetch, peersRetry, peersState } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Runtimes } from '@sand/host-runtimes/contract'
import type { Dispose } from 'drydock'
import { relayCall } from './call'
import { relayFetches } from './fetches'
import { runtimeSubscribers } from './subscribers'

export const runtimeBridge = (hub: Hub, peers: Peers, runtimes: () => Runtimes | undefined): (() => Dispose)[] => {
  const subscribers = runtimeSubscribers(peers, runtimes)
  const fetches = relayFetches(peers, runtimes)
  return [
    () => hub.handle(peersState, () => peers.list()),
    () => hub.handle(peersListen, ({ events }, caller) => subscribers.listen(caller.device, events)),
    () => hub.handle(peersRetry, ({ pc }) => peers.retry(pc)),
    () => hub.handle(peersRelay, ({ pc, request, input, timeout }) => relayCall(peers, pc, request, input, timeout)),
    () => hub.handle(peersRelayFetch, (input, caller) => fetches.open(input, caller.device)),
    () => hub.handle(peersRelayCancel, ({ stream }, caller) => fetches.cancel(stream, caller.device)),
    () => peers.onChange(subscribers.changed),
    () => peers.onOpen(subscribers.opened),
    () => subscribers.close,
    () => fetches.close,
  ]
}
