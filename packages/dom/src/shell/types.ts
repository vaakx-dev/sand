import type { Dispose } from 'drydock'
import type { IconName } from '../icons/lucide'

export interface Handle<T> {
  update(patch?: Partial<T>): void
  dispose(): void
}

export type Region = 'top' | 'side' | 'main' | 'aside' | 'bottom' | 'overlay'

export interface PanelSpec {
  id: string
  title: string
  icon?: IconName
  order?: number
  badge?: string | number
  render(body: HTMLElement): Dispose | void
}

export type PanelPatch = Partial<Omit<PanelSpec, 'id' | 'render'>>

export interface LayoutState {
  narrow: boolean
  open: Record<'side' | 'aside', boolean>
  filled: Record<Region, boolean>
}

export interface Swipe {
  move(dx: number): void
  end(velocity: number): void
}

export interface Layout {
  mount(region: Region, view: HTMLElement, order?: number): Dispose
  cover(region: 'side' | 'main', view: HTMLElement): Dispose
  toggle(region: 'side' | 'aside', open?: boolean): void
  state(): LayoutState
  swipe(): Swipe | undefined
}

declare module 'drydock' {
  interface Services {
    layout: Layout
  }

  interface Events {
    'layout.change': (state: LayoutState) => void
  }
}
