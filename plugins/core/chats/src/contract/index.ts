import { wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { event, service } from 'drydock'
import { z } from 'zod'
import type { Entry } from './entry'
import type { Prompt } from './message'
import { isContextRecord } from './prompt/context'
import type { Session, SessionInfo, Sessions } from './session'

export type * from './entry'
export * from './history'
export type * from './message'
export * from './notification'
export type * from './parts'
export * from './prompt'
export type * from './session'

export interface WireSession {
  $session: SessionInfo
}

export interface WireSessionRef {
  $session: Pick<SessionInfo, 'id'>
}

const isBlock = (block: unknown) =>
  typeof block === 'object' &&
  block !== null &&
  'type' in block &&
  typeof block.type === 'string' &&
  !('typed' in block) &&
  (block.type !== 'context' || ('records' in block && Array.isArray(block.records) && block.records.every(isContextRecord)))

const isPrompt = (value: unknown) => typeof value === 'string' || (Array.isArray(value) && value.every(isBlock))

export const promptInput = lazy(() => z.custom<Prompt>(isPrompt, 'Expected a prompt'))

export const sessions = service<Sessions>('sessions')

export const sessionEntry = event<(session: Session, entry: Entry) => void>('session.entry')
export const sessionUpdate = event<(session: Session) => void>('session.update')
export const sessionSettle = event<(session: Session) => void>('session.settle')
export const sessionRemove = event<(id: string) => void>('session.remove')
export const sessionClosing = event<(session: Session) => string | undefined | Promise<string | undefined>>('session.closing')
export const sessionBusy = event<(session: Session) => boolean>('session.busy')

export const sessionEntryWire = wireEvent<[session: WireSession, entry: Entry]>('session.entry')
export const sessionUpdateWire = wireEvent<WireSession>('session.update')
export const sessionRemoveWire = wireEvent<string>('session.remove')
