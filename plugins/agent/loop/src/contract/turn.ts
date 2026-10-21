import type { Usage } from '@sand/accounts/contract'
import type { Prompt, Session, StopReason } from '@sand/chats/contract'

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
