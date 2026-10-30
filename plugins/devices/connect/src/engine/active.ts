import type { ConnectionStatus } from '@sand/devices-contract'
import type { Opened } from '../dial/open'

export interface Active {
  opened: Opened
  since: number
  latency: number
}

export const connectedStatus = (active: Active): ConnectionStatus => ({
  phase: 'connected',
  route: active.opened.route,
  since: active.since,
  latency: active.latency,
})
