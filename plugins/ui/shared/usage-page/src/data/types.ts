import type { AccountUsage, ModelUsage, PeriodUsage, UnpricedModel, UsageBucket, UsageSummary, UsageTotals } from '@sand/usage/contract'

export interface Pc {
  id: string
  name: string
  home: boolean
  online: boolean
}

export interface PcSummary {
  pc: Pc
  summary: UsageSummary
}

export interface Account extends AccountUsage {
  machines: string[]
}

export interface Project extends UsageTotals {
  name: string
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
  total: UsageTotals
  accounts: Account[]
  models: ModelUsage[]
  periods: PeriodUsage[]
  projects: Project[]
  pcs: PcUsage[]
  unpriced: UnpricedModel[]
}
