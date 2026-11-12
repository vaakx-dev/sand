import type { ChatKind, ContextProjection, ContextRecord, UserContent } from '@sand/chats/contract'
import { service, type Dispose } from 'drydock'

export * from './chips'
export * from './clipboard'

export interface Reader {
  kind: ChatKind | 'bot'
  cwd: string
}

export interface ContextKind {
  kind: string
  title: string
  project(record: ContextRecord, reader: Reader): ContextProjection | Promise<ContextProjection>
}

export interface ContextKinds {
  register(kind: ContextKind): Dispose
  project(content: UserContent[], reader: Reader): Promise<UserContent[]>
}

export const contextKinds = service<ContextKinds>('contextKinds')
