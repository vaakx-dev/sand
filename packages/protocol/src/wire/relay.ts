import type { UserContent } from '../message'
import type { SettingsPatch } from '../settings'
import type { NoticeLevel, PickItem, PickOptions, ReportRow } from '../ui'
import type { OpenedSession } from './session'

export interface RelayContributions {
  commands: { name: string; title?: string; description: string; args?: string }[]
}

export interface RelayPick {
  id: string
  title: string
  items: Omit<PickItem<unknown>, 'value'>[]
  options?: PickOptions
}

export interface RelayInput {
  id: string
  title: string
  value?: string
}

export interface RelayEvents {
  'ui.relay': [contributions: RelayContributions]
  'ui.notify': [text: string, level?: NoticeLevel]
  'ui.report': [title: string, rows: ReportRow[]]
  'ui.pick': [pick: RelayPick]
  'ui.input': [input: RelayInput]
  'ui.open': [session: OpenedSession | null, draft?: string, cwd?: string]
  'ui.attach': [content: UserContent]
  'ui.prepare': [patch: SettingsPatch]
}

export type RelayEvent = { [K in keyof RelayEvents]: { name: K; args: RelayEvents[K] } }[keyof RelayEvents]
