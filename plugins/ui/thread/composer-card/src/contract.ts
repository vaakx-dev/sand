import type { UserContent } from '@sand/messages'
import type { NavAction } from '@sand/protocol'
import type { DraftTarget } from '@sand/web-client/contract'
import type { Dispose } from 'drydock'

export type ComposerSlot = 'start' | 'end' | 'above' | 'banner' | 'tab' | 'tray-start' | 'tray-end'

export interface ComposerContent {
  text: string
  content: UserContent[]
}

export type SlotView = HTMLElement | (() => HTMLElement)

export interface ComposerCapture {
  placeholder(): string
  title(): string
  icon(): string
  input?(text: string): void
  keydown?(event: KeyboardEvent): boolean
  send(text: string): void | Promise<void>
}

export interface Composer {
  focus(): void
  value(): string
  set(text: string): void
  insert(text: string): void
  quote(text: string): void
  attach(content: UserContent[]): void
  slot(where: ComposerSlot, view: SlotView, order?: number): Dispose
  capture(capture: ComposerCapture): Dispose
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

declare module 'drydock' {
  interface Services {
    composer: Composer
    drafts: Drafts
  }

  interface Events {
    'drafts.change': () => void
  }
}
