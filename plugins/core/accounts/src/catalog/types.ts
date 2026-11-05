import type { AccountKind, Billing, ModelInfo, NewModels, PlanApi, PlanModel, ProviderCapabilities } from '../contract'

export interface SourceMeta {
  id: string
  kind: AccountKind
  api?: PlanApi
  caps: ProviderCapabilities
  label: string
  provider: string
  billing: Billing
  plan?: string
  via?: string
  pc?: string
  online?: boolean
}

export interface Entry {
  meta: SourceMeta
  models: ModelInfo[]
  newModels: NewModels
  checked?: number
  error?: string
}

export interface Checked {
  checked: number
  models?: PlanModel[]
  error?: string
}

export type ModelCache = Record<string, Checked>

export interface Prefs {
  hide: string[]
  show: string[]
  favourites: string[]
  added: Record<string, string[]>
  newModels: Record<string, NewModels>
  seen: Record<string, string[]>
  fresh: Record<string, string[]>
}
