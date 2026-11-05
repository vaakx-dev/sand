import type { Effort, Speed, Usage } from '@sand/accounts/contract'
import type { Prompt, Session, StopReason } from '@sand/chats/contract'
import { service } from 'drydock'

export type TurnStatus = 'running' | 'completed' | 'interrupted' | 'failed' | 'lost'

export interface Selection {
  source: string
  model: string
  effort?: Effort
  speed: Speed
}

export interface TurnResult {
  stopReason: StopReason | 'interrupted' | 'error'
  usage: Usage
  text: string
  error?: string
  detail?: string
}

export interface TurnEnding {
  stopReason: TurnResult['stopReason'] | 'lost'
  error?: string
}

export interface TurnInfo {
  id: string
  session: string
  ordinal: number
  status: TurnStatus
  selection: Selection
  prompt: string
  step: number
  usage: Usage
  stopReason?: TurnEnding['stopReason']
  error?: string
  detail?: string
  started: number
  ended?: number
}

export interface RunOptions {
  signal?: AbortSignal
}

export interface Turns {
  run(session: Session, prompt: Prompt, options?: RunOptions): Promise<TurnResult>
  interrupt(session: Session): boolean
  current(session: Session): TurnInfo | undefined
  get(turn: string): TurnInfo | undefined
}

export const turns = service<Turns>('turns')
