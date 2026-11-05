import type { ContextRecord, Session } from '@sand/chats/contract'
import { service, type Dispose } from 'drydock'

export interface ContextKind {
  kind: string
  title: string
  project(record: ContextRecord, session: Session): string | undefined | Promise<string | undefined>
}

export interface ContextKinds {
  register(kind: ContextKind): Dispose
}

export const contextKinds = service<ContextKinds>('contextKinds')
