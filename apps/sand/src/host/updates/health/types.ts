import type { HostHealth } from '@sand/protocol'

export type HealthReport = HostHealth

export interface HealthOutcome {
  ok: boolean
  report?: HealthReport
  error?: string
}
