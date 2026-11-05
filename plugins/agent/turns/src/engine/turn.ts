import type { Usage } from '@sand/accounts/contract'
import type { Entry, Message, Session, StopReason, ToolCallBlock, ToolResultBlock, UserContent } from '@sand/chats/contract'
import type { TurnInfo, TurnResult } from '@sand/turns-contract/contract'
import type { PartialReply } from './partial'

export interface TurnRun {
  info: TurnInfo
  session: Session
  signal: AbortSignal
  partial: PartialReply
  usage: Usage
  reply: string
}

export interface StepDone {
  message: Message
  stopReason: StopReason
}

export interface TurnHooks {
  step(): Promise<StepDone>
  tools(calls: ToolCallBlock[]): Promise<void>
  answer(results: ToolResultBlock[]): void
  inbox(): Promise<UserContent[]>
  append(message: Message): Entry
}

export interface Turn {
  signal: AbortSignal
  hooks: TurnHooks
}

export type TurnOutcome = Pick<TurnResult, 'stopReason'>
