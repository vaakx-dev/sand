import type { UserContent } from '@sand/messages'
import type { DraftTarget } from '@sand/web-client/contract'
import type { Dispose } from 'drydock'

export interface Suggestion {
  value: string
  description?: string
  submit?: boolean
  partial?: boolean
  group?: string
  icon?: string
  trigger?: string
}

export interface CompletionSource {
  trigger: string
  pattern: RegExp
  title?: string
  items(query: string): Suggestion[] | Promise<Suggestion[]>
  hint?(query: string): string | undefined
}

export type ComposerSlot = 'start' | 'end' | 'above' | 'banner'

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
  attach(content: UserContent[]): void
  completer(source: CompletionSource): Dispose
  slot(where: ComposerSlot, view: SlotView, order?: number): Dispose
  capture(capture: ComposerCapture): Dispose
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
