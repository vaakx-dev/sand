import type { ModelUsage, PeriodUsage, UnpricedModel, UsageBucket, UsageSummary, UsageTotals } from '@sand/usage/contract'

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

export type PeriodModels = Pick<PeriodUsage, 'key' | 'models'>

export interface Merged {
  since: number
  until: number
  bucket: UsageBucket
  total: UsageTotals
  models: ModelUsage[]
  periods: PeriodModels[]
  unpriced: UnpricedModel[]
}
