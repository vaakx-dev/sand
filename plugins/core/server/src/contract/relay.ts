import type { LiveBlock } from '@sand/llm-accounts/contract'
import type { Entry, UserContent } from '@sand/messages'
import type { SettingsPatch, SettingsState } from '@sand/model/contract'
import type { SessionInfo } from '@sand/sessions-sqlite/contract'
import type { QueueState } from '@sand/steering/contract'
import type { NoticeLevel, PickItem, PickOptions, ReportRow } from './ui'

export interface OpenedSession {
  info: SessionInfo
  entries: Entry[]
  queue?: QueueState
  settings?: SettingsState
  live?: LiveBlock[]
  tools?: string[]
}

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
