import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { updatesApply, updatesChannel, updatesCheck, updatesHeard, updatesLater, updatesRepair, updatesRestart, updatesState } from './contract'
import type { Updater } from './types'

export const updateRequests = (hub: Hub, updater: Updater): (() => Dispose)[] => [
  () => hub.handle(updatesState, () => updater.state()),
  () => hub.handle(updatesCheck, () => updater.check()),
  () => hub.handle(updatesLater, () => updater.later()),
  () => hub.handle(updatesApply, ({ build }) => updater.apply(build)),
  () => hub.handle(updatesRestart, () => updater.restartNow()),
  () => hub.handle(updatesHeard, ({ channel, build }) => updater.heard(channel, build)),
  () => hub.handle(updatesChannel, ({ channel }) => updater.setChannel(channel)),
  () => hub.handle(updatesRepair, () => updater.repair()),
]
