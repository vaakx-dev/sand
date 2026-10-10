import type { Effort, EffortLevel, ModelInfo, SourceInfo, Speed } from '@sand/llm-accounts/contract'
import type { Session } from '@sand/sessions-sqlite/contract'

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

export interface ModelsUpdate {
  models: ModelInfo[]
  sources: SourceInfo[]
  levels: EffortLevel[]
  defaults: SessionSettings
}

declare module 'drydock' {
  interface Services {
    modelSettings: ModelSettings
  }

  interface Events {
    'modelSettings.change': (session: Session) => void
    'modelSettings.defaults': () => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'settings.get': { session?: string; settings?: SessionSettings }
  }

  interface WireEvents {
    'settings.change': [session: string, state: SettingsState]
    'models.change': [update: ModelsUpdate]
  }

  interface HelloFields {
    models?: ModelInfo[]
    sources?: SourceInfo[]
    defaults?: SessionSettings
    levels?: EffortLevel[]
  }
}
