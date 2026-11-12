import type { ToolSpec } from '@sand/accounts/contract'
import {
  type Entry,
  type Message,
  type Prompt,
  promptInput,
  type Session,
  type ToolCallBlock,
  type ToolResultBlock,
  type UserContent,
  type WireSession,
  type WireSessionRef,
} from '@sand/chats/contract'
import {
  type PendingItem,
  type RunOptions,
  type SendInput as EngineSend,
  sendModes,
  type SendResult,
  type TurnInfo as EngineTurn,
  turnOrigins,
  type TurnResult,
  type WaitUntil,
} from '@sand/engine/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { sessionSettings, type SettingsPatch } from '@sand/model/contract'
import { lazy } from '@sand/util'
import { event, service } from 'drydock'
import { z } from 'zod'

export type {
  PendingItem,
  PendingKind,
  RunOptions,
  SendMode,
  SendResult,
  TurnEnding,
  TurnOrigin,
  TurnResult,
  TurnStatus,
  WaitReason,
  WaitUntil,
} from '@sand/engine/contract'
export { sendModes, turnOrigins } from '@sand/engine/contract'

export type TurnInfo = Omit<EngineTurn, 'owner' | 'conversation'> & { session: string }

export type SendInput = EngineSend & { settings?: SettingsPatch }

export interface Turns {
  send(session: Session, input: SendInput): Promise<SendResult>
  run(session: Session, prompt: Prompt, options?: RunOptions): Promise<TurnResult>
  interrupt(session: Session, turn?: string): boolean
  current(session: Session): TurnInfo | undefined
  get(turn: string): TurnInfo | undefined
  list(session: Session, before?: number, limit?: number): TurnInfo[]
  wait(turn: string, until: WaitUntil, signal?: AbortSignal): Promise<TurnInfo>
  pending(session: Session): PendingItem[]
  withdraw(session: Session, pending: string): boolean
}

export const turns = service<Turns>('turns')

export const turnStart = event<(session: Session, prompt: Message, info: TurnInfo) => void>('turn.start')
export const turnReady = event<(start: Entry, session: Session, signal: AbortSignal) => Promise<void> | void>('turn.ready')
export const turnEnd = event<(session: Session, result: TurnResult, info: TurnInfo) => void>('turn.end')
export const turnChange = event<(info: TurnInfo) => void>('turn.change')
export const turnPending = event<(session: Session) => void>('turn.pending')
export const turnPrompt = event<(content: UserContent[], session: Session) => UserContent[]>('turn.prompt')
export const stepTools = event<(tools: ToolSpec[], session: Session) => ToolSpec[] | Promise<ToolSpec[]>>('step.tools')
export const toolStart = event<(call: ToolCallBlock, session: Session) => void>('tool.start')
export const toolProgress = event<(call: ToolCallBlock, text: string, session: Session) => void>('tool.progress')
export const toolResult = event<(result: ToolResultBlock, call: ToolCallBlock, session: Session) => ToolResultBlock>('tool.result')

export const turnStartWire = wireEvent<[session: WireSession, prompt: Message]>('turn.start')
export const turnEndWire = wireEvent<[session: WireSession, result: TurnResult]>('turn.end')
export const turnChangeWire = wireEvent<[session: WireSessionRef, info: TurnInfo]>('turn.change')
export const turnPendingWire = wireEvent<[session: string, pending: PendingItem[]]>('turn.pending')
export const toolStartWire = wireEvent<[call: ToolCallBlock, session: WireSessionRef]>('tool.start')
export const toolProgressWire = wireEvent<[call: ToolCallBlock, text: string, session: WireSessionRef]>('tool.progress')
export const toolResultWire = wireEvent<[result: ToolResultBlock, call: ToolCallBlock, session: WireSessionRef]>('tool.result')

export const helloTurns = helloField<Record<string, TurnInfo>>('turns')
export const helloTurnsApi = helloField<number>('turnsApi')

const place = 'thread'
const session = lazy(() => z.object({ session: z.string() }))

export const turnSend = request('turn.send', {
  input: () => session().extend({
    prompt: promptInput(),
    mode: z.enum(sendModes).optional(),
    label: z.string().optional(),
    origin: z.enum(turnOrigins).optional(),
    clientRequestId: z.string().min(1),
    settings: sessionSettings().optional(),
  }),
  output: type<SendResult>(),
  place,
})
export const turnWithdraw = request('turn.withdraw', { input: () => session().extend({ pending: z.string() }), output: type<boolean>(), place })
export const turnHold = request('turn.hold', { input: () => session().extend({ pending: z.string(), held: z.boolean() }), output: type<boolean>(), place })
