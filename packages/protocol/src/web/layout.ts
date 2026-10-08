import type { Dispose } from 'drydock'

export type Region = 'top' | 'side' | 'main' | 'aside' | 'bottom' | 'overlay'

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
