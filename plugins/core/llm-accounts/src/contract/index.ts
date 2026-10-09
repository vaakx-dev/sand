import type { Session, WireSession } from '@sand/sessions-sqlite/contract'
import type { LLM, LLMEvent, Limits } from './llm'
import type { LoginProvider, LoginState } from './login'

export type * from './llm'
export type * from './login'

declare module 'drydock' {
  interface Services {
    llm: LLM
  }

  interface Events {
    'llm.event': (event: LLMEvent, session: Session) => void
    'llm.limits': (limits: Limits) => void
    'llm.models': () => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'limits.refresh': {}
    'login.status': {}
    'login.start': { provider: LoginProvider; anyway?: boolean }
    'login.finish': { provider: LoginProvider; code: string }
    'login.key': { provider: LoginProvider; key: string; baseUrl?: string }
    'login.cancel': { provider: LoginProvider }
    'login.logout': { provider: LoginProvider }
    'login.shared': { provider: LoginProvider; shared: boolean }
  }

  interface WireEvents {
    'llm.event': [event: LLMEvent, session: WireSession]
    'llm.limits': [limits: Limits]
    'login.change': [state: LoginState]
  }

  interface HelloFields {
    limits?: Limits
  }
}
