import { colorVar, div, span, type ClassValue } from '@vaakx-dev/vrui'
import { layer } from '../layer'

export const dockFade = () =>
  div({
    class: [layer.sticky, 'pointer-events-none sticky bottom-0'],
    style: { height: 'var(--dock-h, 0px)', background: `linear-gradient(to top, ${colorVar('neutral', 900)} 55%, transparent)` },
  })

export const topFade = () =>
  div({
    class: [layer.sticky, 'pointer-events-none sticky top-0 -mb-4 h-4'],
    style: { background: `linear-gradient(to bottom, ${colorVar('neutral', 900)}, transparent)` },
  })

export const scrollFade = (extra: ClassValue) =>
  span({
    class: ['pointer-events-none absolute inset-x-0 bottom-0 h-8', extra],
    style: { background: `linear-gradient(to top, ${colorVar('neutral', 950)}, transparent)` },
  })
