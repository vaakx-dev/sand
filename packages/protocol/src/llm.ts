import type { Usage } from '@sand/messages'

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

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
  fast?: boolean
  images?: boolean
  via?: string
  hidden?: boolean
  favourite?: number
  fresh?: boolean
  added?: boolean
}

export type ModelPrice = Record<keyof Usage, number>

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

export type LiveEvent =
  | { type: 'start'; model: string }
  | { type: 'text'; index: number; text: string }
  | { type: 'thinking'; index: number; text: string }
  | { type: 'tool_call'; index: number; id: string; name: string }
  | { type: 'tool_input'; index: number; json: string }
  | { type: 'block'; index: number }
  | { type: 'done' }

export type LiveBlock =
  | { type: 'text' | 'thinking'; index: number; text: string; done?: boolean }
  | { type: 'tool'; index: number; id: string; name: string; input: string }
