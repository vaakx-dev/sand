import { efforts, type Effort, type EffortLevel, type ModelInfo, type SourceInfo, type Speed } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface SessionSettings {
  model?: string
  effort?: Effort
  speed?: Speed
}

export interface Selection {
  source: string
  model: string
  effort?: Effort
  speed: Speed
}

export const modelSource = (model: string) => model.slice(0, Math.max(model.indexOf('/'), 0))

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

export const roles = ['lead', 'builder', 'finder'] as const

export type Role = (typeof roles)[number]

export const uses = ['default', 'subagent', 'text'] as const

export type Use = (typeof uses)[number]

export type Picks = Partial<Record<Use, SessionSettings>>

export interface ModelPicks {
  shown: Picks
  chosen: Picks
}

export interface ModelSettings {
  effective(session?: Session): EffectiveSettings
  resolve(settings: SessionSettings, use: Use): EffectiveSettings
  select(session: Session): Selection | undefined
  state(session?: Session): SettingsState
  pick(use: Use): SessionSettings
  change(session: Session, patch: SettingsPatch): void
  match(asked: Asked, near?: string): SettingsPatch
}

export type Asked = { [K in keyof SessionSettings]?: (K extends 'speed' ? Speed : string) | null }

export type ModelRow = Pick<ModelInfo, 'id' | 'label' | 'provider' | 'efforts' | 'defaultEffort' | 'context' | 'fast'> & { current?: true }

export interface ModelsUpdate {
  models: ModelInfo[]
  sources: SourceInfo[]
  efforts: EffortLevel[]
  picks: ModelPicks
}

export const modelSettings = service<ModelSettings>('modelSettings')

export const modelSettingsChange = event<(session: Session) => void>('modelSettings.change')

export const settingsChange = wireEvent<[session: string, state: SettingsState]>('settings.change')
export const modelsChange = wireEvent<ModelsUpdate>('models.change')

export const helloModels = helloField<ModelInfo[]>('models')
export const helloSources = helloField<SourceInfo[]>('sources')
export const helloPicks = helloField<ModelPicks>('picks')
export const helloEfforts = helloField<EffortLevel[]>('efforts')

const effort = lazy(() => z.enum(efforts))
const speed = lazy(() => z.enum(['normal', 'fast']))
export const sessionSettings = lazy(() => z.object({ model: z.string().optional(), effort: effort().optional(), speed: speed().optional() }))

export const settingsGet = request('settings.get', {
  input: () => z.object({ session: z.string().optional(), settings: sessionSettings().optional() }),
  output: type<SettingsState>(),
  place: 'thread',
})
export const pickSet = request('pick.set', {
  input: () => z.object({ use: z.enum(uses), model: z.string().min(1).nullish(), effort: z.string().min(1).nullish(), speed: speed().nullish() }),
  output: type<ModelPicks>(),
  callers: 'any',
  place: 'thread',
})
export const modelsList = request('models.list', {
  input: () => z.object({ thread: z.string().optional() }),
  output: type<ModelRow[]>(),
  callers: 'any',
  place: 'thread',
})
