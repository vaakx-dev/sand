import type { LLMRequest } from '@sand/accounts/contract'
import {
  type Entry,
  type Message,
  promptInput,
  type Session,
  type ToolCallBlock,
  type ToolResultBlock,
  type UserContent,
  type WireSession,
  type WireSessionRef,
} from '@sand/chats/contract'
import { request, type, wireEvent } from '@sand/host-hub/contract'
import { sessionSettings } from '@sand/model/contract'
import type { OpenedSession } from '@sand/server/contract'
import type { TurnInfo, TurnResult } from '@sand/turns-contract/contract'
import { event, service } from 'drydock'
import { z } from 'zod'
import type { Loop } from './turn'

export type * from './turn'

export const loop = service<Loop>('loop')

export const turnStart = event<(session: Session, prompt: Message, info: TurnInfo) => void>('turn.start')
export const turnReady = event<(start: Entry, session: Session, signal: AbortSignal) => Promise<void> | void>('turn.ready')
export const turnEnd = event<(session: Session, result: TurnResult, info: TurnInfo) => void>('turn.end')
export const turnPrompt = event<(content: UserContent[], session: Session) => UserContent[]>('turn.prompt')
export const turnInbox = event<(content: UserContent[], session: Session) => UserContent[]>('turn.inbox')
export const contextBuild = event<(request: LLMRequest, session: Session, signal?: AbortSignal) => LLMRequest>('context.build')
export const contextOverflow = event<(session: Session, error: unknown, signal: AbortSignal) => boolean | undefined>('context.overflow')
export const toolStart = event<(call: ToolCallBlock, session: Session) => void>('tool.start')
export const toolProgress = event<(call: ToolCallBlock, text: string, session: Session) => void>('tool.progress')
export const toolResult = event<(result: ToolResultBlock, call: ToolCallBlock, session: Session) => ToolResultBlock>('tool.result')
export const sessionOpened = event<(opened: OpenedSession, session: Session) => OpenedSession>('session.opened')

export const turnStartWire = wireEvent<[session: WireSession, prompt: Message]>('turn.start')
export const turnEndWire = wireEvent<[session: WireSession, result: TurnResult]>('turn.end')
export const toolStartWire = wireEvent<[call: ToolCallBlock, session: WireSessionRef]>('tool.start')
export const toolProgressWire = wireEvent<[call: ToolCallBlock, text: string, session: WireSessionRef]>('tool.progress')
export const toolResultWire = wireEvent<[result: ToolResultBlock, call: ToolCallBlock, session: WireSessionRef]>('tool.result')

export const loopRun = request('loop.run', {
  input: z.object({ session: z.string(), prompt: promptInput, settings: sessionSettings.optional() }),
  output: type<TurnResult>(),
  place: 'thread',
})
