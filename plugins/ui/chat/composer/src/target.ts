import { promptOf } from '@sand/attachments/contract'
import type { ShelfPlace } from '@sand/attachments/web/contract'
import type { Entry, UserContent } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { DraftTarget, SendOptions } from '@sand/web-client/contract'
import type { Chat, ChatRef } from './contract'

export type Delivery = 'now' | 'queued' | 'unreachable'

export interface Destination {
  conversation: string
  device?: string
  draft?: DraftTarget
}

export interface Outbound {
  id: string
  text: string
  content: UserContent[]
  settings: SessionSettings
  mode?: SendOptions['mode']
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

const nowhere: ShelfPlace = { device: () => undefined, thread: () => undefined }

export const chatTarget = (chat: Chat): Target => ({
  place: nowhere,
  running: chat.running,
  stoppable: chat.running,
  delivery: () => 'now',
  pcName: () => 'sand',
  name: chat.name,
  conversation: () => chat.ref.id,
  chat: () => chat.ref,
  path: chat.path,
  ready: () => true,
  destination: () => ({ conversation: chat.ref.id }),
  shownIn: to => to.conversation,
  deliver: (_to, { id, text, content }) => chat.send(promptOf(text, content), id),
  interrupt: chat.interrupt,
})
