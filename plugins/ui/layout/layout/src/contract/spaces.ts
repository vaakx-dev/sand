import { event, service, type Dispose } from 'drydock'

export interface Space {
  id: string
  label: string
  icon: string
  order?: number
  count?(): number
  attention?(): boolean
}

export type SpaceRegion = 'side' | 'main' | 'aside'

export interface Slot {
  space: string
  region: SpaceRegion
}

export interface Spaces {
  space(space: Space): Dispose
  list(): Space[]
  active(): string | undefined
  open(id: string, options?: { replace?: boolean }): void
}

export const spaces = service<Spaces>('spaces')
export const spaceOpen = event<(id: string) => void>('space.open')
