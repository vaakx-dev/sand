import type { ContextRecord, Entry, Prompt, UserContent } from '@sand/chats/contract'
import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { IconName } from '@sand/ui-kit/contract'
import type { DraftTarget, SkillPlace } from '@sand/web-client/contract'
import type { Child, Sig } from '@vaakx-dev/vrui'
import { event, service, type Context, type Dispose } from 'drydock'

export type ComposerSlot = 'above' | 'banner' | 'start' | 'end' | 'tab'

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

export interface ComposerView {
  restore(saved: ComposerContent): void
  insertWords(text: string): void
}

export type SlotView = (here: ComposerView) => HTMLElement

export interface Aside extends ComposerContent {
  chat: string
}

export type AsideRun = (aside: Aside) => Promise<void>

export interface Draft {
  text: string
  items: UserContent[]
  records?: ContextRecord[]
  settings?: SessionSettings
  target?: DraftTarget
  updated?: number
}

export interface DraftStore {
  read(key: string): Promise<Draft | undefined>
  all(): Promise<Draft[]>
  write(key: string, draft: Draft | undefined): Promise<void>
}

export interface TriggerItem {
  label: string
  description?: string
  icon?: IconName
  path?: boolean
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
  run(chat: ChatRef | undefined): void | Promise<void>
}

export interface ChatRef {
  owner: 'thread' | 'bot'
  id: string
  pc?: string
}

export interface Suggestion {
  text: string
  dismiss(): void
}

export type Suggester = (chat: ChatRef) => Suggestion | undefined

export interface Chat {
  ref: ChatRef
  name(): string
  skills: SkillPlace
  running(): boolean
  path(): Entry[]
  send(prompt: Prompt, clientRequestId: string): Promise<void>
  interrupt(): Promise<void>
  settings?(): SessionSettings
  choose?(patch: SettingsPatch): void
}

export interface DockOptions {
  placeholder?: () => string
}

export interface Sending {
  id: string
  conversation: string
  prompt: Prompt
  at: number
  uploading: boolean
}

export interface ChatDock {
  view: HTMLElement
  sending(): Sending | undefined
  slot(where: ComposerSlot, view: SlotView, order?: number): Dispose
  quote(text: string): void
  focus(): void
}

export interface Composer {
  view(): HTMLElement
  focus(): void
  value(): string
  set(text: string): void
  insert(text: string): void
  reference(record: ContextRecord): void
  quote(text: string): void
  attach(content: UserContent[]): void
  slot(where: ComposerSlot, view: SlotView, order?: number): Dispose
  shared(where: ComposerSlot, view: SlotView, order?: number): Dispose
  aside(run: AsideRun): Dispose
  placeholder(text: () => string | undefined): Dispose
  suggest(source: Suggester): Dispose
  hold(reason: SendHold): Dispose
  snapshot(): Promise<ComposerContent | undefined>
  restore(saved: ComposerContent): void
  clear(): void
  sendMenu(action: MenuAction): Dispose
  plus(entry: PlusEntry, order?: number): Dispose
  trigger<T extends TriggerItem>(trigger: Trigger<T>, order?: number): Dispose
  command(command: Command): Dispose
  settings(): SessionSettings
  choose(patch: SettingsPatch): void
  dock(chat: Chat, options?: DockOptions): ChatDock
  sending(): Sending | undefined
}

export interface Typing {
  idle(run: () => void): Dispose
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

export const sendingCaption = ({ uploading }: Sending) => (uploading ? 'Uploading files…' : 'Sending…')

export const composer = service<Composer>('composer')
export const drafts = service<Drafts>('drafts')
export const draftStore = service<DraftStore>('drafts.store')
export const typing = service<Typing>('typing')
export const draftsChange = event<() => void>('drafts.change')

export const afterTyping = (ctx: Context, run: () => void): Dispose => {
  let done = false
  const once = () => {
    done = true
    run()
  }
  return ctx.watch(typing, found => {
    if (done) return
    if (!found) return once()
    return found.idle(once)
  })
}
