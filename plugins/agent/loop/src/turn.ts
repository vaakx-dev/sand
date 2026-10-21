import type { Entry, Message, StopReason, ToolCallBlock, ToolResultBlock, UserContent } from '@sand/chats/contract'
import type { TurnResult } from './contract'

export interface StreamDone {
  message: Message
  stopReason: StopReason
}

export interface TurnHooks {
  send(): Promise<StreamDone>
  respond(message: Message): void
  tools(calls: ToolCallBlock[]): Promise<ToolResultBlock[]>
  inbox(): Promise<UserContent[]>
  append(message: Message): Entry
}

export interface TurnOutcome {
  stopReason: TurnResult['stopReason']
  text: string
}

export interface Turn {
  signal: AbortSignal
  hooks: TurnHooks
}
