import type { Session } from '@sand/sessions-sqlite/contract'

export type AskKind = 'single' | 'multi' | 'confirm' | 'rank' | 'text'

export interface AskOption {
  label: string
  description?: string
  preview?: string
  recommended?: boolean
}

export interface AskQuestion {
  name: string
  question: string
  type: AskKind
  options: AskOption[]
  detail?: string
  risky?: boolean
}

export interface AskAnswer {
  picked?: number[]
  text?: string
}

export interface AskPending {
  id: string
  session: string
  questions: AskQuestion[]
  source: string
}

export interface Asks {
  ask(session: Session, questions: AskQuestion[], source: string, signal?: AbortSignal): Promise<AskAnswer[] | null>
  pending(session: Session): AskPending[]
}

declare module 'drydock' {
  interface Services {
    asks: Asks
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'ask.answer': { session: string; call: string; answers: AskAnswer[] | null }
  }

  interface WireEvents {
    'ask.open': [pending: AskPending]
    'ask.close': [session: string, id: string]
  }

  interface HelloFields {
    asks?: AskPending[]
  }
}

declare module '@sand/server/contract' {
  interface OpenedSession {
    asks?: AskPending[]
  }
}
