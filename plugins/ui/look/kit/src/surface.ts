import { read, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'

export type Surface = 'page' | 'raised' | 'group'

export interface SurfaceFill {
  hover: string
  marked: string
  opened: string
  on: string
}

const onPage: SurfaceFill = {
  hover: 'hover:bg-neutral-800',
  marked: 'aria-current:bg-neutral-800 aria-selected:bg-neutral-800 aria-pressed:bg-neutral-800',
  opened: 'aria-expanded:bg-neutral-800',
  on: 'bg-neutral-800',
}

const onRaised: SurfaceFill = {
  hover: 'hover:bg-neutral-700',
  marked: 'aria-current:bg-neutral-700 aria-selected:bg-neutral-700 aria-pressed:bg-neutral-700',
  opened: 'aria-expanded:bg-neutral-700',
  on: 'bg-neutral-700',
}

const fills: Record<Surface, SurfaceFill> = { page: onPage, raised: onRaised, group: onRaised }

export const surfaceFill = (surface: Surface) => fills[surface]

const markedText = 'hover:text-neutral-100 aria-current:text-neutral-100 aria-selected:text-neutral-100 aria-pressed:text-neutral-100'

const openedText = 'aria-expanded:text-neutral-100'

export const placeLook = (active: MaybeReactive<boolean>, surface: Surface = 'page', idle: MaybeReactive<string> = 'text-neutral-400', marksOpen = true): ClassValue[] => {
  const fill = fills[surface]
  return [idle, fill.hover, fill.marked, markedText, marksOpen && [fill.opened, openedText], () => (read(active) ? `${fill.on} text-neutral-100` : '')]
}

export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-accent-500'
