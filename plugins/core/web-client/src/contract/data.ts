import type { GrepMatch } from '@sand/project/contract'
import type { EffortLevel, Limits, ModelInfo, SourceInfo } from '@sand/accounts/contract'
import type { EffectiveSettings, SessionSettings, SettingsState } from '@sand/model/contract'
import type { SkillSummary } from '@sand/skills/contract'

export interface Models {
  device(): string
  list(): ModelInfo[]
  sources(): SourceInfo[]
  levels(): EffortLevel[]
  info(id?: string): ModelInfo | undefined
  defaults(): SessionSettings
  state(thread?: string): SettingsState | undefined
  settings(thread?: string): EffectiveSettings | undefined
  label(settings: EffectiveSettings): string
  summary(settings: SessionSettings): string
  describe(thread?: string): string | undefined
}

export interface LimitsFeed {
  current(): Limits | undefined
  all(): Limits[]
  refresh(): Promise<void>
}

export interface FileIndex {
  list(cwd?: string): Promise<string[]>
  grep(query: string, cwd?: string): Promise<GrepMatch[]>
}

export interface SkillIndex {
  list(): SkillSummary[]
}
