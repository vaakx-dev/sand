import type { ContextLink, ContextRecord } from '@sand/chats/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { Child } from '@vaakx-dev/vrui'
import { service, type Dispose } from 'drydock'

export type ChipLink = Pick<ContextLink, 'kind' | 'id' | 'label'>

export interface ChipAction {
  label: string
  run(record: ContextRecord): void
}

export interface ChipKind {
  kind: string
  title: string
  icon: IconName
  details?(record: ContextRecord): Child
  action?: ChipAction
}

export interface ContextChips {
  register(kind: ChipKind): Dispose
  chip(link: ChipLink, record?: ContextRecord): HTMLElement
}

export const contextChips = service<ContextChips>('contextChips')
