import type { Dispose } from 'drydock'

export interface Handle<T> {
  update(patch?: Partial<T>): void
  dispose(): void
}

export type Region = 'top' | 'side' | 'main' | 'aside' | 'bottom' | 'overlay'

export interface PanelSpec {
  id: string
  title: string
  icon?: string
  order?: number
  badge?: string | number
  render(body: HTMLElement): Dispose | void
}

export type PanelPatch = Partial<Omit<PanelSpec, 'id' | 'render'>>
