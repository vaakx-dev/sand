import { type Dispose, service } from 'drydock'

export interface ModelButton {
  open(effort?: boolean): void
}

export const modelButton = service<ModelButton>('modelButton')

export type DefaultsView = () => HTMLElement

export interface ModelDefaults {
  slot(view: DefaultsView, order?: number): Dispose
}

export const modelDefaults = service<ModelDefaults>('modelDefaults')
