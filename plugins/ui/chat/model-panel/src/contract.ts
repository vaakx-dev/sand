import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import { type Dispose, service } from 'drydock'

export interface ModelTarget {
  settings(): SessionSettings
  choose(patch: SettingsPatch): void
  running?(): boolean
}

export interface ModelButton {
  /** A new button for the target, built in the caller's scope. */
  view(target: ModelTarget): HTMLElement
  /** Opens the picker of the button mounted last. */
  open(): void
}

export const modelButton = service<ModelButton>('modelButton')

export type DefaultsView = () => HTMLElement

export interface ModelDefaults {
  slot(view: DefaultsView, order?: number): Dispose
}

export const modelDefaults = service<ModelDefaults>('modelDefaults')
