import type { AccountUsage, ModelUsage, PeriodUsage, ThreadUsage, UnpricedModel, UsageBucket, UsageSummary, UsageTotals } from '@sand/usage/contract'

export interface Pc {
  id: string
  name: string
  local: boolean
  online: boolean
}

export interface PcSummary {
  pc: Pc
  summary: UsageSummary
}

export interface Account extends AccountUsage {
  machines: string[]
}

export interface Thread extends ThreadUsage {
  machine: string
}

export interface Project extends UsageTotals {
  name: string
  threads: number
  accounts: string[]
  machines: string[]
}

export interface PcUsage extends UsageTotals {
  id: string
  name: string
  accounts: string[]
}

export interface Merged {
  since: number
  until: number
  bucket: UsageBucket
  total: UsageTotals & { threads: number }
  accounts: Account[]
  models: ModelUsage[]
  periods: PeriodUsage[]
  threads: Thread[]
  projects: Project[]
  pcs: PcUsage[]
  unpriced: UnpricedModel[]
}
