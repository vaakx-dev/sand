import type { EffortLevel, ModelInfo } from '../llm'
import type { ContextUsage, QueueState } from '../loop'
import type { Entry, SessionInfo, SessionMeta } from '../session'
import type { SessionSettings, SettingsState } from '../settings'
import type { LiveBlock } from '../web/threads'

export type SessionMetaUpdate = SessionMeta & { id: string }

export interface ModelsUpdate {
  models: ModelInfo[]
  levels: EffortLevel[]
  defaults: SessionSettings
}

export interface SessionEvents {
  'session.meta': [meta: SessionMetaUpdate]
  'queue.change': [session: string, state: QueueState]
  'settings.change': [session: string, state: SettingsState]
  'context.change': [session: string, usage: ContextUsage]
  'models.change': [update: ModelsUpdate]
}

export interface OpenedSession {
  info: SessionInfo
  entries: Entry[]
  queue?: QueueState
  settings?: SettingsState
  live?: LiveBlock[]
  tools?: string[]
}
