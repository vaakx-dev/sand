import { wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'
import type { Entry } from './entry'
import type { Prompt } from './message'
import type { Session, SessionInfo, Sessions } from './session'

export type * from './entry'
export type * from './message'
export type * from './parts'
export type * from './session'

export interface WireSession {
  $session: SessionInfo
}

export interface WireSessionRef {
  $session: Pick<SessionInfo, 'id'>
}

const isPrompt = (value: unknown) =>
  typeof value === 'string' || (Array.isArray(value) && value.every(block => typeof block === 'object' && block !== null && typeof block.type === 'string'))

export const promptInput = z.custom<Prompt>(isPrompt, 'Expected a prompt')

export const sessions = service<Sessions>('sessions')

export const sessionEntry = event<(session: Session, entry: Entry) => void>('session.entry')
export const sessionUpdate = event<(session: Session) => void>('session.update')
export const sessionRemove = event<(id: string) => void>('session.remove')
export const sessionClosing = event<(session: Session) => string | undefined | Promise<string | undefined>>('session.closing')

export const sessionEntryWire = wireEvent<[session: WireSession, entry: Entry]>('session.entry')
export const sessionUpdateWire = wireEvent<WireSession>('session.update')
export const sessionRemoveWire = wireEvent<string>('session.remove')
