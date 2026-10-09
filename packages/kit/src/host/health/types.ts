import type { HostHealth } from '@sand/host-health/contract'

export type HealthReport = HostHealth

export interface HealthOutcome {
  ok: boolean
  report?: HealthReport
  error?: string
}
