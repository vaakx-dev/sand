import type { Delivery, LLMEvent, LLMRequest, NativeRef, Usage } from '@sand/accounts/contract'
import type { AppendMeta, Entry, Message, Prompt, StopReason, ToolCallBlock, ToolResultBlock, ToolResultContent, UserContent } from '@sand/chats/contract'
import type { Selection } from '@sand/model/contract'
import { type Dispose, event, service } from 'drydock'

export type Owner = 'thread' | 'bot'

export interface Conversation {
  id: string
  owner: Owner
  cwd: string
  append(type: string, data: unknown, meta?: AppendMeta): Entry
  path(): Entry[]
  entries(): Entry[]
}

export type ConversationRef = Pick<Conversation, 'owner' | 'id'>

export type TurnStatus = 'running' | 'waiting' | 'completed' | 'interrupted' | 'failed' | 'lost'

export const turnOrigins = ['user', 'job', 'wake', 'review', 'agent', 'routine', 'print', 'cli', 'mcp', 'bot'] as const

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
  steps: number
  error?: string
  detail?: string
}

export interface TurnEnding {
  stopReason: TurnResult['stopReason'] | 'lost'
  error?: string
}

export interface TurnInfo {
  id: string
  owner: Owner
  conversation: string
  ordinal: number
  status: TurnStatus
  origin: TurnOrigin
  selection: Selection
  providerThread?: string
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

export interface StepDone {
  native?: NativeRef
  delivered?: Delivery
  usage: Usage
  cacheTtlMs?: number
  reply: string
}

export interface Step {
  request: LLMRequest & { model: string }
  thread?: string
  settle(done: StepDone): void
  lost(error: unknown): boolean
}

export interface Conversations<C extends Conversation> {
  owner: Owner
  open(id: string): C | undefined
  select(conversation: C): Selection | undefined
  held?(conversation: C): boolean
  step(conversation: C, turn: TurnInfo, signal: AbortSignal): Promise<Step>
  abandon?(thread: string): void
  prompt?(content: UserContent[], conversation: C): UserContent[] | Promise<UserContent[]>
  ready?(prompt: Entry, conversation: C, signal: AbortSignal): void | Promise<void>
  overflow?(conversation: C, turn: TurnInfo, error: unknown, signal: AbortSignal): boolean | undefined | Promise<boolean | undefined>
  started?(conversation: C, prompt: Message, turn: TurnInfo): void
  ended?(conversation: C, result: TurnResult, turn: TurnInfo): void
  lost?(conversation: C, turn: TurnInfo): void
  changed?(turn: TurnInfo): void
  queued?(conversation: C): void
  streamed?(event: LLMEvent, conversation: C): void
  toolStarted?(call: ToolCallBlock, conversation: C): void
  toolProgress?(call: ToolCallBlock, text: string, conversation: C): void
  toolDone?(result: ToolResultBlock, call: ToolCallBlock, conversation: C): ToolResultBlock | Promise<ToolResultBlock>
}

export interface Runner<C extends Conversation> {
  send(conversation: C, input: SendInput): Promise<SendResult>
  run(conversation: C, prompt: Prompt, options?: RunOptions): Promise<TurnResult>
  interrupt(conversation: C, turn?: string): boolean
  current(conversation: C): TurnInfo | undefined
  get(turn: string): TurnInfo | undefined
  list(conversation: C, before?: number, limit?: number): TurnInfo[]
  live(): TurnInfo[]
  wait(turn: string, until: WaitUntil, signal?: AbortSignal): Promise<TurnInfo>
  follow(conversation: C, sent: SendResult, signal?: AbortSignal): Promise<TurnInfo | undefined>
  pending(conversation: C): PendingItem[]
  withdraw(conversation: C, pending: string): boolean
  hold(conversation: C, pending: string, held: boolean): boolean
  forget(conversation: string): void
  detach(): void
}

export interface Engine {
  attach<C extends Conversation>(conversations: Conversations<C>): Runner<C>
  turn(owner: Owner, id: string): TurnInfo | undefined
  open(conversation: ConversationRef): Conversation | undefined
}

export const engine = service<Engine>('engine')

export interface ViewReset {
  keep: string | null
  thread?: string
}

export interface EntryView {
  type: string
  message(entry: Entry, path: Entry[]): Message | undefined
  resets?(entry: Entry): ViewReset
}

export interface EntryViews {
  register(view: EntryView): Dispose
  get(type: string): EntryView | undefined
}

export const entryViews = service<EntryViews>('entryViews')

export const turnOpen = event<(conversation: Conversation, turn: TurnInfo) => void>('conversation.turn.open')

export const turnClose = event<(conversation: Conversation, result: TurnResult, turn: TurnInfo) => void>('conversation.turn.close')

export const turnContent = event<(content: UserContent[], conversation: Conversation) => UserContent[] | Promise<UserContent[]>>('turn.content')

export const toolContent = event<(content: ToolResultContent[], conversation: Conversation) => ToolResultContent[] | Promise<ToolResultContent[]>>('tool.content')
