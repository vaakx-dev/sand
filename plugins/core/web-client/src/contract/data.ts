import type { GrepMatch } from '@sand/project/contract'
import type { EffortLevel, Limits, ModelInfo, SourceInfo } from '@sand/accounts/contract'
import type { EffectiveSettings, LevelPicks, SessionSettings, SettingsState } from '@sand/model/contract'
import type { SkillSummary } from '@sand/skills/contract'

export interface Models {
  device(): string
  list(): ModelInfo[]
  known(): boolean
  sources(): SourceInfo[]
  efforts(): EffortLevel[]
  levels(): LevelPicks
  info(id?: string): ModelInfo | undefined
  state(thread?: string): SettingsState | undefined
  settings(thread?: string): EffectiveSettings | undefined
  label(settings: SessionSettings): string
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
