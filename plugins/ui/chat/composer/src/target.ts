import { promptOf } from '@sand/attachments/contract'
import type { ShelfPlace } from '@sand/attachments/web/contract'
import type { Entry, UserContent } from '@sand/chats/contract'
import type { SessionSettings } from '@sand/model/contract'
import type { SendOptions } from '@sand/web-client/contract'
import type { Chat, ChatRef } from './contract'

export type Delivery = 'now' | 'queued' | 'unreachable'

export type Outgoing = Pick<SendOptions, 'mode'> & { clientRequestId: string }

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
  send(text: string, content: UserContent[], picked: SessionSettings, options: Outgoing): Promise<void>
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
  send: (text, content, _picked, { clientRequestId }) => chat.send(promptOf(text, content), clientRequestId),
  interrupt: chat.interrupt,
})
