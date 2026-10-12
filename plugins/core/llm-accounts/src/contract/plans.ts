import type { Effort, LimitWindow } from '@sand/protocol'

export interface PlanTokens {
  access: string
  refresh: string
  expires: number
  email?: string
  plan?: string
  accountId?: string
}

export type PlanSignIn =
  | { kind: 'paste'; url: string; finish(code: string): Promise<PlanTokens> }
  | { kind: 'device'; url: string; code: string; expires: number; wait(): Promise<PlanTokens> }

export type Payload = Record<string, unknown>

export interface PlanCall {
  url: string
  payload: Payload
  headers(fast: boolean): Record<string, string>
  original?(name: string): string
}

export interface PlanModel {
  name: string
  label?: string
  context?: number
  efforts?: Effort[]
  defaultEffort?: Effort
  images?: boolean
}

export interface PlanLimits {
  windows: LimitWindow[]
  status?: string
}

export type PlanApi = 'anthropic' | 'openai'

export interface Plan {
  id: string
  label: string
  name: string
  detail: string
  logo: string
  api: PlanApi
  signIn(signal: AbortSignal): Promise<PlanSignIn>
  refresh(tokens: PlanTokens): Promise<PlanTokens>
  call(tokens: PlanTokens, payload: Payload): PlanCall
  models(tokens: PlanTokens): Promise<PlanModel[]>
  limits?(response: Response): PlanLimits | undefined | Promise<PlanLimits | undefined>
  usage?(tokens: PlanTokens): Promise<PlanLimits>
}

export interface Plans {
  register(plan: Plan): () => void
}

declare module 'drydock' {
  interface Services {
    llmPlans: Plans
  }
}
