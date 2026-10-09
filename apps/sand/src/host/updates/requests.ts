import type { Hub } from '@sand/protocol'
import type { Dispose } from 'drydock'
import { isChannel } from './store'
import type { Updater } from './types'

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

export const updateRequests = (hub: Hub, updater: Updater): (() => Dispose)[] => [
  () => hub.handle('updates.state', () => updater.state()),
  () => hub.handle('updates.check', () => updater.check()),
  () => hub.handle('updates.later', () => updater.later()),
  () =>
    hub.handle('updates.apply', ({ build }) => {
      if (!text(build)) throw new Error('updates.apply needs a build')
      return updater.apply(build)
    }),
  () =>
    hub.handle('updates.channel', ({ channel }) => {
      if (!isChannel(channel)) throw new Error('updates.channel needs "release" or "nightly"')
      return updater.setChannel(channel)
    }),
  () => hub.handle('updates.repair', () => updater.repair()),
]
