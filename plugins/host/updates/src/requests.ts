import { pcNamed, type Peers, reachablePeers } from '@sand/devices-contract'
import type { Hub, Request } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { updatesApply, updatesChannel, updatesCheck, updatesHeard, updatesLater, updatesRepair, updatesRestart, updatesState, type UpdateState } from './contract'
import type { Updater } from './types'

type PcInput = { pc?: string }

export const updateRequests = (hub: Hub, updater: Updater, linked: () => Peers | undefined): (() => Dispose)[] => {
  const onPc = <I extends PcInput>(request: Request<I, UpdateState>, here: (input: I) => UpdateState | Promise<UpdateState>) =>
    hub.handle(request, input => (input.pc ? reachablePeers(linked()).call(pcNamed(linked(), input.pc).id, request, { ...input, pc: undefined }) : here(input)))

  return [
    () => onPc(updatesState, () => updater.state()),
    () => onPc(updatesCheck, () => updater.check()),
    () => onPc(updatesLater, () => updater.later()),
    () => onPc(updatesApply, ({ build }) => updater.apply(build)),
    () => onPc(updatesRestart, () => updater.restartNow()),
    () => hub.handle(updatesHeard, ({ channel, build }) => updater.heard(channel, build)),
    () => onPc(updatesChannel, ({ channel }) => updater.setChannel(channel)),
    () => hub.handle(updatesRepair, () => updater.repair()),
  ]
}
