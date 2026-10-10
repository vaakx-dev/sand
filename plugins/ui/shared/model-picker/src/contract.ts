import type { Effort, ModelInfo, Speed } from '@sand/llm-accounts/contract'
import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import type { Notify } from '@sand/toasts/contract'
import type { Child, MenuSpec } from '@sand/dom'

export interface Picked {
  model?: string
  effort?: Effort
  speed: Speed
  supportsEffort: boolean
  supportsFast: boolean
}

export interface PickerTarget {
  shown(): Picked | undefined
  set(patch: SettingsPatch): void
  key?(): string
  badge?(model: ModelInfo): Child
  extra?(): Child
}

export interface PanelOptions {
  flash?: boolean
}

export interface ModelPicker {
  panel(target: PickerTarget, close: () => void, options?: PanelOptions): Child
  button(target: PickerTarget, label: string): HTMLElement
  resolve(settings: SessionSettings): Picked
  online(pc: string): boolean | undefined
  menu(input: ModelMenuInput): MenuSpec
}

export interface ModelMenuInput {
  model: ModelInfo
  subtitle?: string
  notify?: Notify
  use?: () => void
  makeDefault?: () => void
  toggleFavourite?: () => void
  toggleHidden?: () => void
  remove?: () => void
}

declare module 'drydock' {
  interface Services {
    modelPicker: ModelPicker
  }
}
