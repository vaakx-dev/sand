import type { Prompt, StopReason, Usage } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'

export type { UsageRecord } from '@sand/protocol'

export interface TurnResult {
  stopReason: StopReason | 'interrupted' | 'error'
  usage: Usage
  text: string
  error?: string
  detail?: string
}

export type TurnEnding = Pick<TurnResult, 'stopReason' | 'error'>

export interface Loop {
  run(session: Session, prompt: Prompt, signal?: AbortSignal): Promise<TurnResult>
  interrupt(session: Session): boolean
  active(session: Session): boolean
  started(session: Session): boolean
}
