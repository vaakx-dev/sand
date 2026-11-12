import type { ModelInfo } from '@sand/accounts/contract'
import type { EffectiveSettings, SessionSettings, SettingsPatch } from '@sand/model/contract'
import type { MenuSpec } from '@sand/ui-kit/contract'
import type { Child } from '@vaakx-dev/vrui'
import { service } from 'drydock'

export * from './models'

export type Picked = Omit<EffectiveSettings, 'chosen' | 'source'>

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

export type ButtonLook = 'field' | 'row'

export interface ButtonOptions {
  label: string
  look?: ButtonLook
  opened?: boolean
  opener?(open: () => void): () => void
}

export interface ModelCatalog {
  list(source: string): Promise<ModelInfo[]>
  add(source: string, name: string): Promise<ModelInfo>
  remove(model: string): Promise<void>
  favourite(model: string, on: boolean): Promise<void>
  hide(model: string, hidden: boolean): Promise<void>
  showNew(source: string, show: boolean): Promise<void>
  seen(source: string): Promise<void>
  refresh(source?: string): Promise<void>
}

export interface ModelPicker {
  panel(target: PickerTarget, close: () => void, options?: PanelOptions): Child
  button(target: PickerTarget, options: ButtonOptions): HTMLElement
  resolve(settings: SessionSettings): Picked
  online(pc: string): boolean | undefined
  menu(input: ModelMenuInput): MenuSpec
  catalog: ModelCatalog
}

export interface ModelMenuInput {
  model: ModelInfo
  subtitle?: string
  use?: () => void
  makeDefault?: () => void
  toggleFavourite?: () => void
  toggleHidden?: () => void
  remove?: () => void
}

export const modelPicker = service<ModelPicker>('modelPicker')
