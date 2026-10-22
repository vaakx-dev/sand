import type { ChatKind, StopReason, ToolResultBlock, UserContent } from '@sand/chats/contract'
import type { ToolSpec } from './llm'
import type { Effort, LimitWindow, ModelPrice } from './models'
import type { Usage } from './usage'

export interface PlanTokens {
  access: string
  refresh: string
  expires: number
  email?: string
  plan?: string
  accountId?: string
}

export type SignInFlow<T> =
  | { kind: 'paste'; url: string; finish(code: string): Promise<T>; wait?(): Promise<T> }
  | { kind: 'device'; url: string; code: string; expires: number; wait(): Promise<T> }
  | { kind: 'browser'; url: string; wait(): Promise<T> }

export type PlanSignIn = SignInFlow<PlanTokens>

export type Payload = Record<string, unknown>

export interface PlanCall {
  url: string
  payload: Payload
  headers(fast: boolean): Record<string, string>
  original?(name: string): string
}

export interface PlanModel {
  name: string
  label: string
  context?: number
  maxOutput?: number
  efforts?: Effort[]
  defaultEffort?: Effort
  fast?: boolean
  images?: boolean
  price?: ModelPrice
}

export interface PlanLimits {
  windows: LimitWindow[]
  status?: string
}

export type PlanApi = 'anthropic' | 'openai'

interface PlanInfo {
  id: string
  label: string
  name: string
  detail: string
  logo: string
}

export interface Plan extends PlanInfo {
  api: PlanApi
  signIn(signal: AbortSignal): Promise<PlanSignIn>
  refresh(tokens: PlanTokens): Promise<PlanTokens>
  call(tokens: PlanTokens, payload: Payload, sessionKind?: ChatKind): PlanCall
  models(tokens: PlanTokens): Promise<PlanModel[]>
  limits?(response: Response): PlanLimits | undefined | Promise<PlanLimits | undefined>
  usage?(tokens: PlanTokens): Promise<PlanLimits>
}

export interface AppStatus {
  installed: boolean
  signedIn: boolean
  email?: string
  plan?: string
  problem?: string
}

export interface AppSetup {
  model: string
  effort?: Effort
  system: string
  tools: ToolSpec[]
  history: string
  cwd: string
  sessionKind?: ChatKind
}

export interface AppCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface AppOutput {
  text(text: string): void
  thinking(text: string): void
  call(call: AppCall): void
  usage(usage: Partial<Usage>): void
  pause(): void
  finish(stopReason?: StopReason): void
  fail(error: unknown): void
}

export interface AppSession {
  send(content: UserContent[]): void
  steer?(content: UserContent[]): void
  answer(id: string, result: ToolResultBlock): void
  interrupt(): void
  close(): void
}

export interface AppPlan extends PlanInfo {
  app: string
  install: string
  family?: PlanApi
  status(): Promise<AppStatus>
  signIn(signal: AbortSignal): Promise<SignInFlow<void>>
  signOut(): Promise<void>
  models(): Promise<PlanModel[]>
  usage?(): Promise<PlanLimits | undefined>
  open(setup: AppSetup, output: AppOutput): Promise<AppSession>
}

export type AnyPlan = Plan | AppPlan

export interface Plans {
  register(plan: AnyPlan): () => void
  limits(id: string, limits: PlanLimits): void
}
