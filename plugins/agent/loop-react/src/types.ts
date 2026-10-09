import type { LLMEvent, Pending, Session, TurnResult, Usage, UserContent } from '@sand/protocol'
import type { Context } from 'drydock'
import type { PartialReply } from './partial'

export type LoopContext = Context<'llm' | 'context' | 'tools'>

export type Done = Extract<LLMEvent, { type: 'done' }>

export interface Turn {
  queue: (Pending & { prompt: UserContent[] })[]
  controller: AbortController
}

export interface Progress {
  usage: Usage
  model?: string
  stopReason: TurnResult['stopReason']
  reply: string
}

export interface TurnRun {
  ctx: LoopContext
  session: Session
  turn: Turn
  signal: AbortSignal
  progress: Progress
  partial: PartialReply
}
