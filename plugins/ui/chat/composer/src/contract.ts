import type { ContextRecord, UserContent } from '@sand/chats/contract'
import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import type { NavAction } from '@sand/nav/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { DraftTarget } from '@sand/web-client/contract'
import type { Child, Sig } from '@vaakx-dev/vrui'
import { event, service, type Dispose } from 'drydock'

export type ComposerSlot = 'banner' | 'start' | 'end' | 'tab'

export interface PlusEntry {
  icon(): IconName
  label(): string
  open: Sig<boolean>
  panel(): Child
  unusual(): string | undefined
  reset(): void
}

export type SendHold = () => string | undefined

export interface ComposerContent {
  text: string
  content: UserContent[]
}

export type SlotView = HTMLElement | (() => HTMLElement)

export interface TriggerItem {
  label: string
  description?: string
  icon?: IconName
  partial?: boolean
}

export interface Trigger<T extends TriggerItem = TriggerItem> {
  char: string
  label: string
  items(query: string): T[] | Promise<T[]>
  accept(item: T): string | ContextRecord
}

export interface Command {
  name: string
  description: string
  run(): void | Promise<void>
}

export interface Composer {
  focus(): void
  value(): string
  set(text: string): void
  insert(text: string): void
  reference(record: ContextRecord): void
  quote(text: string): void
  attach(content: UserContent[]): void
  slot(where: ComposerSlot, view: SlotView, order?: number): Dispose
  hold(reason: SendHold): Dispose
  snapshot(): Promise<ComposerContent | undefined>
  restore(saved: ComposerContent): void
  clear(): void
  sendMenu(action: NavAction): Dispose
  plus(entry: PlusEntry, order?: number): Dispose
  trigger<T extends TriggerItem>(trigger: Trigger<T>, order?: number): Dispose
  command(command: Command): Dispose
  settings(): SessionSettings
  choose(patch: SettingsPatch): void
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
