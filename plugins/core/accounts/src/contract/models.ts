import type { Usage } from './usage'

export const efforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const

export type Effort = (typeof efforts)[number]

export const isEffort = (value: unknown): value is Effort => efforts.some(effort => effort === value)

export interface ModelInfo {
  id: string
  label: string
  source?: string
  name?: string
  provider?: string
  summary?: string
  efforts: Effort[]
  defaultEffort?: Effort
  context?: number
  maxOutput?: number
  fast?: boolean
  images?: boolean
  via?: string
  hidden?: boolean
  favourite?: number
  fresh?: boolean
  added?: boolean
}

export type ModelPrice = { [K in keyof Usage]: number }

export type Billing = 'plan' | 'api' | 'credits' | 'local'

export interface ProviderInfo {
  id: string
  label: string
  billing: Billing
  plan?: string
}

export interface SourceRef {
  source: string
  label: string
  provider: string
  billing: Billing
  plan?: string
  pc?: string
  pcName?: string
}

export interface LimitWindow {
  id: string
  label: string
  used: number
  resetsAt?: number
  duration?: number
  status?: string
}
