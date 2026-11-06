import type { Prompt } from '@sand/chats/contract'
import { request, type Request, type } from '@sand/host-hub/contract'
import { type SendResult, sendModes, type TurnOrigin, type TurnStatus, type WaitReason, type WaitUntil } from '@sand/turns-contract/contract'
import { errorMessage } from '@sand/util'
import { service } from 'drydock'
import { z } from 'zod'

export const outsideOrigins = ['cli', 'mcp'] as const

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

export const threadViews = ['messages', 'activity'] as const

export type ThreadView = (typeof threadViews)[number]

export interface ThreadItem {
  seq: number
  at: number
  role: 'user' | 'assistant'
  text: string
  turn?: string
}

export interface ThreadPage {
  thread: string
  items: ThreadItem[]
  next: number
  more: boolean
}

export interface ReadOptions {
  after?: number
  limit?: number
  view?: ThreadView
}

export interface StartInput {
  cwd?: string
  project?: string
  prompt: Prompt
  title?: string
  model?: string
  effort?: string
  worktree?: boolean
  origin: TurnOrigin
  clientRequestId: string
}

export interface Orchestrator {
  start(input: StartInput): Promise<Sent>
  wait(thread: string, until: WaitUntil, signal: AbortSignal): Promise<ThreadState>
  read(thread: string, options: ReadOptions): ThreadPage
}

export const orchestrator = service<Orchestrator>('orchestrator')

export interface ThreadRow {
  thread: string
  title: string
  cwd: string
  project: string | null
  updated: number
  status: ThreadStatus
  settled: boolean
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
const session = z.object({ session: z.string() })
const prompt = z.string().min(1)
const origin = z.enum(outsideOrigins)
const clientRequestId = z.string().min(1)

export const threadStart = request('thread.start', {
  input: z.object({
    cwd: z.string().optional(),
    project: z.string().optional(),
    prompt,
    title: z.string().optional(),
    model: z.string().optional(),
    effort: z.string().optional(),
    worktree: z.boolean().optional(),
    pc: z.string().min(1).optional(),
    origin,
    clientRequestId,
  }),
  output: type<Sent>(),
  callers,
  place,
})
export const threadSend = request('thread.send', {
  input: session.extend({ prompt, mode: z.enum(sendModes).optional(), origin, clientRequestId }),
  output: type<Sent>(),
  callers,
  place,
})
export const threadWait = request('thread.wait', {
  input: session.extend({ until: z.enum(['end', 'attention']).optional(), timeoutMs: z.number().int().min(0).max(waitLimit).optional() }),
  output: type<ThreadState>(),
  callers,
  place,
})
export const threadRead = request('thread.read', {
  input: session.extend({
    after: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(readLimit).optional(),
    view: z.enum(threadViews).optional(),
  }),
  output: type<ThreadPage>(),
  callers,
  place,
})
export const threadList = request('thread.list', {
  input: z.object({ cwd: z.string().optional(), project: z.string().optional(), limit: z.number().int().min(1).max(readLimit).optional() }),
  output: type<ThreadRow[]>(),
  callers,
})
export const threadStop = request('thread.stop', { input: session, output: type<boolean>(), callers, place })

export const settled = (status: ThreadStatus, until: WaitUntil) => status !== 'running' && (until === 'attention' || status !== 'waiting')

export type Call = <I, O>(request: Request<I, O>, input: I, options?: { timeout?: number }) => Promise<O>

const slice = 20_000
export const answerGrace = 10_000

export const waitThread = async (call: Call, session: string, until: WaitUntil, deadline = Infinity): Promise<ThreadState> => {
  for (;;) {
    const timeoutMs = Math.max(0, Math.min(slice, deadline - Date.now()))
    const state = await call(threadWait, { session, until, timeoutMs }, { timeout: timeoutMs + answerGrace })
    if (settled(state.status, until) || Date.now() >= deadline) return state
  }
}
