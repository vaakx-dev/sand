import { event, service, type Dispose } from 'drydock'
import type { Slot, SpaceRegion } from './spaces'

export type Strip = 'top' | 'rail' | 'bottom' | 'overlay'

export type Region = Strip | SpaceRegion

export type Target = Strip | Slot

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
  mount(target: Target, view: HTMLElement, order?: number): Dispose
  cover(region: 'side' | 'main', view: HTMLElement): Dispose
  toggle(region: 'side' | 'aside', open?: boolean): void
  handOff(): void
  state(): LayoutState
  swipe(): Swipe | undefined
}

export const layout = service<Layout>('layout')
export const layoutChange = event<(state: LayoutState) => void>('layout.change')
