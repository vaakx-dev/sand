import type { Hub } from '@sand/protocol'
import type { Dispose } from 'drydock'
import type { InstallKeys } from '../installs'

export const installRequests = (hub: Pick<Hub, 'handle'>, installs: Pick<InstallKeys, 'issue' | 'cancel'>): (() => Dispose)[] => [
  () => hub.handle('install.create', () => installs.issue()),
  () => hub.handle('install.cancel', ({ install }) => installs.cancel(install)),
]
