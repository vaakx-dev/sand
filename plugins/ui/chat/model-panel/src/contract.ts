import { type Dispose, service } from 'drydock'

export interface ModelPill {
  open(effort?: boolean): void
}

export const modelPill = service<ModelPill>('modelPill')

export type DefaultsView = () => HTMLElement

export interface ModelDefaults {
  slot(view: DefaultsView, order?: number): Dispose
}

export const modelDefaults = service<ModelDefaults>('modelDefaults')
