import type { ShelfPlace } from '@sand/attachments/web/contract'
import type { Entry, UserContent } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { ChatRef, Destination } from './contract'

export type Delivery = 'now' | 'queued' | 'unreachable'

export interface Outbound {
  id: string
  text: string
  content: UserContent[]
  settings: SessionSettings
}

export interface Target {
  place: ShelfPlace
  running(): boolean
  stoppable(): boolean
  delivery(): Delivery
  pcName(): string
  name(): string
  conversation(): string | undefined
  chat(): ChatRef | undefined
  path(): Entry[]
  ready(picked: SessionSettings): boolean
  destination(): Destination | undefined
  shownIn(to: Destination): string
  deliver(to: Destination, message: Outbound): Promise<void>
  interrupt(): Promise<void>
}
