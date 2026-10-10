import type { WireJob } from '@sand/agents/contract'
import type { GrepMatch } from '@sand/files/contract'
import type { EffortLevel, Limits, ModelInfo, SourceInfo } from '@sand/llm-accounts/contract'
import type { EffectiveSettings, SessionSettings, SettingsPatch, SettingsState } from '@sand/model/contract'
import type { SkillSummary } from '@sand/skills/contract'

export interface JobState extends WireJob {
  notes: string[]
}

export interface Jobs {
  list(parent?: string): JobState[]
  cancel(id: string): Promise<void>
}

export interface Models {
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
  draft(): SessionSettings
  prepare(patch?: SettingsPatch): void
}

export interface LimitsFeed {
  current(): Limits | undefined
  refresh(): Promise<void>
}

export interface FileIndex {
  list(cwd?: string): Promise<string[]>
  grep(query: string, cwd?: string): Promise<GrepMatch[]>
}

export interface SkillIndex {
  list(): SkillSummary[]
}
