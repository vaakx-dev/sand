import type { ContextProjection, ContextRecord, Session } from '@sand/chats/contract'
import { service, type Dispose } from 'drydock'

export * from './chips'
export * from './clipboard'

export interface ContextKind {
  kind: string
  title: string
  project(record: ContextRecord, session: Session): ContextProjection | Promise<ContextProjection>
}

export interface ContextKinds {
  register(kind: ContextKind): Dispose
}

export const contextKinds = service<ContextKinds>('contextKinds')
