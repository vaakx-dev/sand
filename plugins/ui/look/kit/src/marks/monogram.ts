import { rect, span, svg, textEl } from '@vaakx-dev/vrui'

export type Tint = 'gold' | 'sky' | 'orange' | 'green' | 'red' | 'grey'

const tints: Record<Tint, string> = {
  gold: 'text-warning-400',
  sky: 'text-sky-400',
  orange: 'text-orange-400',
  green: 'text-success-400',
  red: 'text-danger-400',
  grey: 'text-neutral-400',
}

export const monogram = (letters: string, tint: Tint, size: 16 | 20 = 16) =>
  span(
    { class: ['inline-flex shrink-0 font-mono font-bold', tints[tint]], 'aria-hidden': 'true' },
    svg(
      { viewBox: '0 0 20 20', width: size, height: size },
      rect({ width: 20, height: 20, rx: 5, fill: 'currentColor', fillOpacity: 0.15 }),
      textEl({ x: 10, y: 10, textAnchor: 'middle', dominantBaseline: 'central', fill: 'currentColor', fontSize: 10 }, letters),
    ),
  )
