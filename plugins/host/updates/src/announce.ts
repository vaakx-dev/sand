import type { Peers } from '@sand/devices-contract'
import { updatesHeard, type UpdateChannel } from './contract'

const timeout = 10_000

export const announcer = (peers: () => Peers | undefined) => (channel: UpdateChannel, build: string) =>
  void peers()?.callEach(updatesHeard, { channel, build }, { timeout })
