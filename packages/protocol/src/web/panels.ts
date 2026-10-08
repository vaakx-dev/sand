import type { Dispose } from 'drydock'
import type { Handle } from './handle'

export interface PanelSpec {
  id: string
  title: string
  icon?: string
  order?: number
  badge?: string | number
  render(body: HTMLElement): Dispose | void
}

export type PanelPatch = Partial<Omit<PanelSpec, 'id' | 'render'>>

export interface Panels {
  panel(panel: PanelSpec): Handle<Omit<PanelSpec, 'id' | 'render'>>
  show(id: string): void
  toggle(id: string): void
  hide(): void
  current(): string | undefined
  list(): string[]
}
