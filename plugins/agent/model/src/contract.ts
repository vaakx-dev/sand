import type { Effort, EffortLevel, ModelInfo, SourceInfo, Speed } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import type { CliFlags } from '@sand/config/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

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
  effective(session?: Session): EffectiveSettings
  resolve(settings: SessionSettings): EffectiveSettings
  state(session?: Session): SettingsState
  defaults(): SessionSettings
  update(session: Session, patch: SessionSettings): SessionSettings
  flags(flags: CliFlags): SessionSettings | undefined
}

export interface ModelsUpdate {
  models: ModelInfo[]
  sources: SourceInfo[]
  levels: EffortLevel[]
  defaults: SessionSettings
}

export const modelSettings = service<ModelSettings>('modelSettings')

export const modelSettingsChange = event<(session: Session) => void>('modelSettings.change')
export const modelSettingsDefaults = event<() => void>('modelSettings.defaults')

export const settingsChange = wireEvent<[session: string, state: SettingsState]>('settings.change')
export const modelsChange = wireEvent<ModelsUpdate>('models.change')

export const helloModels = helloField<ModelInfo[]>('models')
export const helloSources = helloField<SourceInfo[]>('sources')
export const helloDefaults = helloField<SessionSettings>('defaults')
export const helloLevels = helloField<EffortLevel[]>('levels')

const effort = z.enum(['low', 'medium', 'high', 'xhigh', 'max'])
const speed = z.enum(['normal', 'fast'])
const settings = z.object({ model: z.string().optional(), effort: effort.optional(), speed: speed.optional() })
const patch = z.object({ model: z.string().nullish(), effort: effort.nullish(), speed: speed.nullish() })

export const settingsGet = request('settings.get', {
  input: z.object({ session: z.string().optional(), settings: settings.optional() }),
  output: type<SettingsState>(),
  place: 'thread',
})
export const settingsSet = request('settings.set', { input: z.object({ session: z.string().optional(), patch }), output: type<void>(), place: 'thread' })
export const settingsSave = request('settings.save', { input: z.object({ session: z.string() }), output: type<void>(), place: 'thread' })
