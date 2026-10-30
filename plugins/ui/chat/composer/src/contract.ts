import type { UserContent } from '@sand/chats/contract'
import type { NavAction } from '@sand/nav/contract'
import type { DraftTarget } from '@sand/web-client/contract'
import { event, service, type Dispose } from 'drydock'

export type ComposerSlot = 'banner' | 'start' | 'end' | 'tab' | 'tray-start' | 'tray-end'

export type SendHold = () => string | undefined

export interface ComposerContent {
  text: string
  content: UserContent[]
}

export type SlotView = HTMLElement | (() => HTMLElement)

export interface Composer {
  focus(): void
  value(): string
  set(text: string): void
  insert(text: string): void
  quote(text: string): void
  attach(content: UserContent[]): void
  slot(where: ComposerSlot, view: SlotView, order?: number): Dispose
  hold(reason: SendHold): Dispose
  snapshot(): Promise<ComposerContent | undefined>
  restore(saved: ComposerContent): void
  clear(): void
  sendMenu(action: NavAction): Dispose
}

export interface ThreadDraft extends DraftTarget {
  text: string
  attachments: number
  updated: number
}

export interface Drafts {
  list(): ThreadDraft[]
  remove(id: string): void
}

export const composer = service<Composer>('composer')
export const drafts = service<Drafts>('drafts')
export const draftsChange = event<() => void>('drafts.change')
