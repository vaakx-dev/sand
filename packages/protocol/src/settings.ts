import type { Effort, Speed } from './llm'
import type { Session } from './session'

export interface SessionSettings {
  model?: string
  effort?: Effort
  speed?: Speed
}

export type SettingsPatch = { [K in keyof SessionSettings]?: SessionSettings[K] | null }

export type SettingSource = 'session' | 'default' | 'model'

export interface EffectiveSettings {
  model?: string
  effort?: Effort
  speed: Speed
  supportsEffort: boolean
  supportsFast: boolean
  chosen: SessionSettings
  source: { model: SettingSource; effort?: SettingSource; speed: SettingSource }
}

export interface SettingsState {
  current: EffectiveSettings
  next?: EffectiveSettings
}

export interface ModelSettings {
  of(session?: Session): SessionSettings
  effective(session?: Session): EffectiveSettings
  resolve(settings: SessionSettings): EffectiveSettings
  state(session?: Session): SettingsState
  defaults(): SessionSettings
  update(session: Session, patch: SessionSettings): SessionSettings
  flags(): SessionSettings | undefined
}
