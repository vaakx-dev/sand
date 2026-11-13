import { type HistoryEntry, type HistoryItem, type HistoryItemPage, type HistoryPage, type HistoryReading, historyReading, notificationText, type Prompt, promptInput, type Session } from '@sand/chats/contract'
import type { ConversationRef, Owner } from '@sand/engine/contract'
import { type Actor, request, type Request, type } from '@sand/host-hub/contract'
import { type SendMode, type SendResult, sendModes, type TurnOrigin, type TurnStatus, type WaitReason, type WaitUntil } from '@sand/turns-contract/contract'
import { type SessionSettings, sessionSettings, type SettingsPatch } from '@sand/model/contract'
import { errorMessage, lazy } from '@sand/util'
import { type Dispose, event, service } from 'drydock'
import { z } from 'zod'

export const outsideOrigins = ['cli', 'mcp'] as const

export const pendingActions = ['withdraw', 'hold', 'release'] as const

export type PendingAction = (typeof pendingActions)[number]

const actorOrigins: Record<Actor['owner'], TurnOrigin> = { thread: 'agent', bot: 'bot' }

export const originOf = (actor: Actor | undefined, outside: TurnOrigin) => (actor ? actorOrigins[actor.owner] : outside)

export type ThreadStatus = TurnStatus | 'idle'

export interface ThreadState {
  thread: string
  turn?: string
  status: ThreadStatus
  waiting?: WaitReason
  reply?: string
  error?: string
}

export type Sent = SendResult & { thread: string }

export type { HistoryItem }

type Named = Partial<Record<Owner, string>>

export type HistoryRead = Named & HistoryPage

export type ItemRead = Named & HistoryItemPage

export interface StartInput {
  cwd?: string
  project?: string
  quick?: true
  prompt: Prompt
  label?: string
  title?: string
  model?: string
  effort?: string
  speed?: SessionSettings['speed']
  worktree?: boolean
  branch?: string
  base?: string
  origin: TurnOrigin
  clientRequestId: string
  from?: ConversationRef
  subagent?: { call: string }
}

export interface Notice {
  text: string
  clientRequestId: string
}

export interface Report {
  from: ConversationRef
  label: string
  status: TurnStatus
  at: number
  result: string
}

const outcomes: Partial<Record<TurnStatus, string>> = { completed: 'done', interrupted: 'cancelled' }

export const reportOf = ({ from: { owner, id }, label, status, at, result }: Report) =>
  notificationText({ from: owner, id, kind: owner, label, status: outcomes[status] ?? 'failed', at, result })

export interface SendInput {
  prompt: Prompt
  mode?: SendMode
  label?: string
  settings?: SettingsPatch
  origin: TurnOrigin
  clientRequestId: string
  from?: ConversationRef
}

export interface OwnerKind {
  deliver(id: string, notice: Notice): Promise<unknown> | undefined
  label(id: string): string | undefined
  history(id: string): HistoryEntry[] | undefined
  project?(id: string): string | undefined
  folder?(id: string): string | undefined
}

export interface Orchestrator {
  start(input: StartInput, adopt?: (session: Session) => void): Promise<Sent>
  send(thread: string, input: SendInput): Promise<Sent>
  wait(thread: string, until: WaitUntil, signal: AbortSignal, by?: ConversationRef): Promise<ThreadState>
  read(conversation: ConversationRef, reading: HistoryReading): HistoryRead
  item(conversation: ConversationRef, item: string, offset?: number): ItemRead
  starterOf(thread: string): ConversationRef | undefined
  started(owner: Owner): Record<string, string>
  sign(prompt: Prompt, from: ConversationRef | undefined): Prompt
  owner(owner: Owner, kind: OwnerKind): Dispose
}

export const orchestrator = service<Orchestrator>('orchestrator')

export interface AgentMeta {
  name?: string
  depth: number
  tools?: string[]
}

export interface AgentLimits {
  child(parent: Session | undefined, name?: string, tools?: string[]): AgentMeta
  give(session: Session, meta: AgentMeta): void
  covers(caller: Session, target: Session): boolean
}

export const agentLimits = service<AgentLimits>('agentLimits')

export const subagentStarted = event<(subagent: string, starter: ConversationRef) => void>('subagent.started')

export interface ThreadRow {
  thread: string
  title: string
  cwd: string
  project: string | null
  updated: number
  status: ThreadStatus
  pinned: boolean
  settled: boolean
  snoozed?: number
  pc?: string
}

export const failureCodes = ['not_found', 'invalid_request', 'unavailable', 'denied', 'failed'] as const

export type FailureCode = (typeof failureCodes)[number]

export interface Failure {
  code: FailureCode
  message: string
}

export const failure = (code: FailureCode, message: string) => new Error(`${code}: ${message}`)

export const failureOf = (error: unknown): Failure => {
  const message = errorMessage(error)
  const code = failureCodes.find(candidate => message.startsWith(`${candidate}: `))
  return code ? { code, message: message.slice(code.length + 2) } : { code: 'failed', message }
}

export const waitLimit = 25_000
export const readLimit = 200

const place = 'thread'
const callers = 'any'
const session = lazy(() => z.object({ session: z.string() }))
const prompt = lazy(() => promptInput().refine(given => given.length > 0, 'Write a message'))
const origin = lazy(() => z.enum(['user', ...outsideOrigins]))
const clientRequestId = lazy(() => z.string().min(1))

export const threadStart = request('thread.start', {
  input: () => z.object({
    cwd: z.string().optional(),
    project: z.string().optional(),
    quick: z.literal(true).optional(),
    prompt: prompt(),
    label: z.string().optional(),
    title: z.string().optional(),
    model: z.string().optional(),
    effort: z.string().optional(),
    speed: sessionSettings().shape.speed,
    worktree: z.boolean().optional(),
    branch: z.string().min(1).optional(),
    base: z.string().min(1).optional(),
    pc: z.string().min(1).optional(),
    origin: origin(),
    clientRequestId: clientRequestId(),
  }),
  output: type<Sent>(),
  callers,
  place,
})
export const threadSend = request('thread.send', {
  input: () => session().extend({
    prompt: prompt(),
    mode: z.enum(sendModes).optional(),
    label: z.string().optional(),
    settings: sessionSettings().optional(),
    origin: origin(),
    clientRequestId: clientRequestId(),
  }),
  output: type<Sent>(),
  callers,
  place,
})
export const threadPending = request('thread.pending', {
  input: () => session().extend({ pending: z.string().min(1), action: z.enum(pendingActions) }),
  output: type<boolean>(),
  callers,
  place,
})
export const threadWait = request('thread.wait', {
  input: () => session().extend({ until: z.enum(['end', 'attention']).optional(), timeoutMs: z.number().int().min(0).max(waitLimit).optional() }),
  output: type<ThreadState>(),
  callers,
  place,
})
const conversation = lazy(() => z.object({ session: z.string().optional(), bot: z.string().optional() }))

export const historyRead = request('history.read', { input: () => historyReading().extend(conversation().shape), output: type<HistoryRead>(), callers, place })
export const itemRead = request('history.item', {
  input: () => conversation().extend({ item: z.string().min(1), offset: z.number().int().min(0).optional() }),
  output: type<ItemRead>(),
  callers,
  place,
})
export const threadList = request('thread.list', {
  input: () => z.object({
    cwd: z.string().optional(),
    project: z.string().optional(),
    mine: z.boolean().optional(),
    bot: z.string().optional(),
    thread: z.string().optional(),
    subagents: z.boolean().optional(),
    limit: z.number().int().min(1).max(readLimit).optional(),
  }),
  output: type<ThreadRow[]>(),
  callers,
})
export const threadStop = request('thread.stop', { input: session, output: type<boolean>(), callers, place })
export const threadUpdate = request('thread.update', {
  input: () => session().extend({
    title: z.string().min(1).optional(),
    pinned: z.boolean().optional(),
    snoozed: z.number().int().positive().nullable().optional(),
    settled: z.boolean().optional(),
    worktree: z.literal(true).optional(),
    branch: z.string().min(1).optional(),
    model: z.string().min(1).nullish(),
    effort: z.string().min(1).nullish(),
    speed: z.enum(['normal', 'fast']).nullish(),
  }),
  output: type<ThreadRow>(),
  callers,
  place,
})

export const settled = (status: ThreadStatus, until: WaitUntil) => status !== 'running' && (until === 'attention' || status !== 'waiting')

export type Call = <I, O>(request: Request<I, O>, input: I, options?: { timeout?: number }) => Promise<O>

const slice = 20_000
export const answerGrace = 10_000

export const waitThread = async (call: Call, session: string, until: WaitUntil, deadline = Infinity, signal?: AbortSignal): Promise<ThreadState> => {
  for (;;) {
    signal?.throwIfAborted()
    const timeoutMs = Math.max(0, Math.min(slice, deadline - Date.now()))
    const state = await call(threadWait, { session, until, timeoutMs }, { timeout: timeoutMs + answerGrace })
    if (settled(state.status, until) || Date.now() >= deadline) return state
  }
}
