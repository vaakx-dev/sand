import type { LiveEvent } from '@sand/accounts/contract'
import type { WireSession, WireSessionRef } from '@sand/chats/contract'
import { wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import type { EntryHead, LiveSnapshot } from './relay'
import type { Server } from './server'

export type * from './relay'
export type * from './server'
export * from './hello'
export * from './requests'

export const server = service<Server>('server')

export const pagesChange = event<(pages: number) => void>('server.pages')

export const sessionCarry = event<(types: string[]) => string[]>('session.carry')

export const liveSnapshot = wireEvent<[session: string, snapshot: LiveSnapshot]>('live.snapshot')
export const llmEventWire = wireEvent<[event: LiveEvent, session: WireSessionRef]>('llm.event')
export const sessionHeadWire = wireEvent<[session: WireSession, entry: EntryHead]>('session.head')
