import type { Dispose } from 'drydock'
import type { UserContent } from '../message'

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

export type ComposerSlot = 'start' | 'end' | 'above'

export type SlotView = HTMLElement | (() => HTMLElement)

export interface Composer {
  focus(): void
  value(): string
  set(text: string): void
  insert(text: string): void
  attach(content: UserContent[]): void
  completer(source: CompletionSource): Dispose
  slot(where: ComposerSlot, view: SlotView, order?: number): Dispose
}
