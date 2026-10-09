import type { Billing } from '@sand/llm-accounts/contract'
import type { Prompt, StopReason, Usage } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'

export interface TurnResult {
  stopReason: StopReason | 'interrupted' | 'error'
  usage: Usage
  text: string
  error?: string
  detail?: string
}

export interface UsageRecord {
  id?: string
  model?: string
  provider?: string
  billing?: Billing
  usage: Usage
}

export interface Loop {
  run(session: Session, prompt: Prompt, signal?: AbortSignal): Promise<TurnResult>
  interrupt(session: Session): boolean
  active(session: Session): boolean
}
