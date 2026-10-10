import type { Session, WireSessionRef } from '@sand/sessions-sqlite/contract'
import type { LiveEvent, LLM, LLMEvent, Limits, NewModels } from './llm'
import type { KeyKind, LoginState, ServerDraft, SignInKind } from './login'

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
    'login.start': { account: SignInKind; anyway?: boolean }
    'login.finish': { account: SignInKind; code: string }
    'login.key': { account: KeyKind; key: string; baseUrl?: string }
    'login.server': ServerDraft
    'login.detect': {}
    'login.cancel': { account: string }
    'login.logout': { account: string }
    'login.shared': { account: string; shared: boolean }
    'models.catalog': { source: string }
    'models.pref': { model: string; hidden?: boolean; favourite?: boolean }
    'models.add': { source: string; name: string }
    'models.remove': { model: string }
    'models.newModels': { source: string; mode: NewModels }
    'models.seen': { source: string }
    'models.refresh': { source?: string }
  }

  interface WireEvents {
    'llm.event': [event: LiveEvent, session: WireSessionRef]
    'llm.limits': [limits: Limits]
    'login.change': [state: LoginState]
  }

  interface HelloFields {
    limits?: Limits
  }
}
