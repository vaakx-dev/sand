import type { Dispose } from 'drydock'
import type { UserContent } from './message'
import type { Session } from './session'
import type { SessionSettings, SettingsPatch } from './settings'

export interface Command {
  name: string
  title?: string
  description: string
  args?: string
  run(args: string): void | Promise<void>
}

export type PickTone = 'accent' | 'warning' | 'error'

export interface PickItem<T> {
  label: string
  detail?: string
  prefix?: string
  search?: string
  tone?: PickTone
  value: T
}

export interface PickAction {
  id: string
  label: string
  row?: boolean
  danger?: boolean
}

export interface PickOptions {
  status?: string
  hint?: string
  actions?: PickAction[]
  query?: string
  selected?: number
  rank?: boolean
  empty?: string
}

export interface Picked<T> {
  value?: T
  action?: string
  query: string
}

export type NoticeLevel = 'info' | 'error'

export type ReportRow =
  | { kind: 'pair'; label: string; value: string }
  | { kind: 'bar'; label: string; fraction: number; value: string }
  | { kind: 'text'; text: string; mono?: boolean }

export interface UI {
  command(command: Command): Dispose
  notify(text: string, level?: NoticeLevel): void
  report(title: string, rows: ReportRow[]): void
  pick<T>(title: string, items: PickItem<T>[], options?: PickOptions): Promise<T | undefined>
  choose<T>(title: string, items: PickItem<T>[], options?: PickOptions): Promise<Picked<T> | undefined>
  input(title: string, value?: string): Promise<string | undefined>
  session(): Session | undefined
  cwd(): string
  open(session: Session | undefined, draft?: string, cwd?: string): void
  attach(content: UserContent): void
  prepare?(patch: SettingsPatch): void
  draft?(): SessionSettings | undefined
}
