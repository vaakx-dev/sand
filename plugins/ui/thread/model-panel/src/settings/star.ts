import { iconButton, path, read, span, svg, type MaybeReactive } from '@sand/dom'

const shape =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'

export const starIcon = (on: MaybeReactive<boolean>, size = 15) =>
  span(
    { class: ['inline-flex shrink-0', () => (read(on) ? 'text-warning-400' : 'text-neutral-500')], 'aria-hidden': 'true' },
    svg(
      { viewBox: '0 0 24 24', width: size, height: size },
      path({
        d: shape,
        fill: () => (read(on) ? 'currentColor' : 'none'),
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinejoin: 'round',
      }),
    ),
  )

export const starButton = (label: string, on: MaybeReactive<boolean>, toggle: () => void) =>
  iconButton(
    {
      size: 'sm',
      title: () => (read(on) ? `Remove ${label} from favourites` : `Add ${label} to favourites`),
      'aria-label': `Favourite ${label}`,
      'aria-pressed': () => String(read(on)),
      onClick: toggle,
    },
    starIcon(on),
  )
