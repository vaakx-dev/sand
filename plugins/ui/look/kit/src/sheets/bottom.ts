import { div, event, type Child } from '@vaakx-dev/vrui'
import { scrim, type ScrimProps } from './scrim'

export type BottomSheetProps = ScrimProps

export const bottomSheet = ({ close, from, class: extra, ...props }: BottomSheetProps, ...children: Child[]) =>
  scrim(
    { close, from, class: 'items-end', 'data-menu-layer': '', onPointerDown: event(close, { self: true }) },
    div(
      { ...props, class: ['w-full rounded-t-xl bg-neutral-800 px-2 pt-2 pb-safe ring-1 ring-neutral-700', extra] },
      div({ class: 'mx-auto mb-2 h-1 w-8 shrink-0 rounded-full bg-neutral-700' }),
      ...children,
    ),
  )
