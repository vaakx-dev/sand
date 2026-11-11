import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { type Dispose, service } from 'drydock'

export interface ModelTarget {
  settings(): SessionSettings
  choose(patch: SettingsPatch): void
  running?(): boolean
}

export interface ModelButton {
  view(target: ModelTarget): HTMLElement
  open(): boolean
  reveal(show: () => void): Dispose
}

export const modelButton = service<ModelButton>('modelButton')

export type TargetSource = (subject: Subject) => ModelTarget | undefined

export interface ModelTargets {
  source(source: TargetSource): Dispose
  of(subject: Subject): ModelTarget | undefined
}

export const modelTargets = service<ModelTargets>('modelTargets')

export type DefaultsView = () => HTMLElement

export interface ModelDefaults {
  slot(view: DefaultsView, order?: number): Dispose
}

export const modelDefaults = service<ModelDefaults>('modelDefaults')
