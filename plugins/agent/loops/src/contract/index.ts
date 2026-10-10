import type { LLMRequest } from '@sand/llm-accounts/contract'
import type { Message, ToolCallBlock, ToolResultBlock, UserContent } from '@sand/messages'
import type { OpenedSession } from '@sand/server/contract'
import type { Session, WireSession, WireSessionRef } from '@sand/sessions-sqlite/contract'
import type { LoopInfo, LoopState, Loops, ModelChoice, ToolAsk, ToolDecision } from './loops'
import type { Loop, TurnResult } from './turn'

export type * from './loops'
export type * from './turn'

declare module 'drydock' {
  interface Services {
    loop: Loop
    loops: Loops
  }

  interface Events {
    'turn.start': (session: Session, prompt: Message) => void
    'turn.end': (session: Session, result: TurnResult) => void
    'turn.stop': (session: Session, result: TurnResult, signal: AbortSignal) => UserContent[] | undefined
    'turn.continue': (session: Session, content: UserContent[]) => void
    'turn.prompt': (content: UserContent[], session: Session) => UserContent[]
    'turn.prepare': (session: Session, signal: AbortSignal) => void
    'turn.inbox': (content: UserContent[], session: Session) => UserContent[]
    'context.build': (request: LLMRequest, session: Session, signal?: AbortSignal) => LLMRequest
    'context.overflow': (session: Session, error: unknown, signal: AbortSignal) => boolean | undefined
    'llm.response': (message: Message, session: Session) => Message
    'model.choose': (session: Session, prompt: Message) => ModelChoice | undefined
    'tool.before': (call: ToolCallBlock, session: Session, signal: AbortSignal) => ToolDecision | undefined
    'tool.approve': (call: ToolCallBlock, decision: ToolAsk, session: Session, signal: AbortSignal) => boolean | undefined
    'tool.start': (call: ToolCallBlock, session: Session) => void
    'tool.result': (result: ToolResultBlock, call: ToolCallBlock, session: Session) => ToolResultBlock
    'session.opened': (opened: OpenedSession, session: Session) => OpenedSession
    'loop.change': (session: Session, state: LoopState) => void
  }
}

declare module '@sand/server/contract' {
  interface OpenedSession {
    loop?: LoopState
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'loops.list': {}
    'loop.choose': { session: string; loop: string | null }
  }

  interface WireEvents {
    'turn.start': [session: WireSession, prompt: Message]
    'turn.end': [session: WireSession, result: TurnResult]
    'turn.continue': [session: WireSession, content: UserContent[]]
    'tool.start': [call: ToolCallBlock, session: WireSessionRef]
    'tool.result': [result: ToolResultBlock, call: ToolCallBlock, session: WireSessionRef]
    'loop.change': [session: string, state: LoopState]
  }

  interface HelloFields {
    loops?: LoopInfo[]
  }
}
