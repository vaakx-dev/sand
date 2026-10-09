import type { Hub } from '@sand/protocol'
import type { Dispose } from 'drydock'
import type { Updater } from './types'

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

export const updateRequests = (hub: Hub, updater: Updater): (() => Dispose)[] => [
  () => hub.handle('updates.state', () => updater.state()),
  () => hub.handle('updates.check', () => updater.check()),
  () => hub.handle('updates.later', () => updater.later()),
  () =>
    hub.handle('updates.apply', ({ source, build }) => {
      if (!text(source) || !text(build)) throw new Error('updates.apply needs a source and a build')
      return updater.apply(source, build)
    }),
]
