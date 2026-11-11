import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import { type Dispose, service } from 'drydock'

export interface ModelTarget {
  settings(): SessionSettings
  choose(patch: SettingsPatch): void
  running?(): boolean
}

export interface ModelButton {
  view(target: ModelTarget): HTMLElement
  open(): void
}

export const modelButton = service<ModelButton>('modelButton')

export type DefaultsView = () => HTMLElement

export interface ModelDefaults {
  slot(view: DefaultsView, order?: number): Dispose
}

export const modelDefaults = service<ModelDefaults>('modelDefaults')
