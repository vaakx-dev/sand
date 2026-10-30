import type { Kit } from '@sand/ui-kit/contract'
import type { Data } from './data'
import type { UiContext } from './inject'
import type { Toasts } from './shared/toasts'

export type AddStep = 'list' | 'phone' | 'install' | 'link'

export interface Openers {
  details(pc: string): void
  why(pc: string): void
  add(step?: AddStep): void
  command(install: string): void
}

export interface Ui {
  ctx: UiContext
  kit: Kit
  data: Data
  toasts: Toasts
  open: Openers
  device(): string
}
