import type { LLMRequest, Usage } from '@sand/accounts/contract'
import {
  type Entry,
  type Message,
  type Prompt,
  promptInput,
  type Session,
  type StopReason,
  type ToolCallBlock,
  type ToolResultBlock,
  type UserContent,
  type WireSession,
  type WireSessionRef,
} from '@sand/chats/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { type Selection, type SessionSettings, sessionSettings } from '@sand/model/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export type TurnStatus = 'running' | 'waiting' | 'completed' | 'interrupted' | 'failed' | 'lost'

export const turnOrigins = ['user', 'job', 'wake', 'review', 'agent', 'print'] as const

export type TurnOrigin = (typeof turnOrigins)[number]

export interface WaitReason {
  kind: 'secret' | 'question'
  call: string
  title: string
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
  origin: TurnOrigin
  selection: Selection
  prompt: string
  step: number
  usage: Usage
  waiting?: WaitReason
  stopReason?: TurnEnding['stopReason']
  error?: string
  detail?: string
  started: number
  ended?: number
}

export const sendModes = ['auto', 'steer', 'queue'] as const

export type SendMode = (typeof sendModes)[number]

export interface SendInput {
  prompt: Prompt
  mode?: SendMode
  label?: string
  origin?: TurnOrigin
  clientRequestId: string
  settings?: SessionSettings
}

export type SendResult = { disposition: 'started'; turn: string } | { disposition: 'steered' | 'queued'; pending: string; turn?: string }

export type PendingKind = 'steer' | 'queue'

export interface PendingItem {
  id: string
  kind: PendingKind
  label: string
  prompt: Prompt
  origin: TurnOrigin
  held: boolean
  at: number
}

export type WaitUntil = 'end' | 'attention'

export interface RunOptions {
  origin?: TurnOrigin
  signal?: AbortSignal
}

export interface Turns {
  send(session: Session, input: SendInput): Promise<SendResult>
  run(session: Session, prompt: Prompt, options?: RunOptions): Promise<TurnResult>
  interrupt(session: Session, turn?: string): boolean
  current(session: Session): TurnInfo | undefined
  get(turn: string): TurnInfo | undefined
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
export const contextBuild = event<(request: LLMRequest, session: Session, signal?: AbortSignal) => LLMRequest>('context.build')
export const contextOverflow = event<(session: Session, error: unknown, signal: AbortSignal) => boolean | undefined>('context.overflow')
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
const session = z.object({ session: z.string() })

export const turnSend = request('turn.send', {
  input: session.extend({
    prompt: promptInput,
    mode: z.enum(sendModes).optional(),
    label: z.string().optional(),
    origin: z.enum(turnOrigins).optional(),
    clientRequestId: z.string().min(1),
    settings: sessionSettings.optional(),
  }),
  output: type<SendResult>(),
  place,
})
export const turnInterrupt = request('turn.interrupt', { input: session.extend({ turn: z.string().optional() }), output: type<boolean>(), place })
export const turnWithdraw = request('turn.withdraw', { input: session.extend({ pending: z.string() }), output: type<boolean>(), place })
export const turnHold = request('turn.hold', { input: session.extend({ pending: z.string(), held: z.boolean() }), output: type<boolean>(), place })
export const turnGet = request('turn.get', { input: session.extend({ turn: z.string().optional() }), output: type<TurnInfo | null>(), place })
export const turnList = request('turn.list', {
  input: session.extend({ before: z.number().int().optional(), limit: z.number().int().min(1).max(50).optional() }),
  output: type<TurnInfo[]>(),
  place,
})
export const turnWait = request('turn.wait', {
  input: session.extend({ turn: z.string(), until: z.enum(['end', 'attention']), timeoutMs: z.number().int().min(0).max(25_000).optional() }),
  output: type<TurnInfo>(),
  place,
})
export const turnPendingList = request('turn.pending', { input: session, output: type<PendingItem[]>(), place })
