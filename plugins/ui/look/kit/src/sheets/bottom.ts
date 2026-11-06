import { div, event, type Child, type Props } from '@vaakx-dev/vrui'
import { layer } from '../layer'
import { modal } from '../layers/stack'

export type BottomSheetProps = Props<HTMLDivElement> & {
  close: () => void
  from: Element | null
}

export const bottomSheet = ({ close, from, class: extra, ...props }: BottomSheetProps, ...children: Child[]) =>
  div(
    {
      class: [layer.dialog, 'fixed inset-0 flex items-end bg-black/50 pt-10 animate-fade'],
      'data-menu-layer': '',
      onPointerDown: event(close, { self: true }),
      onMount: node => modal(node, close, from),
    },
    div(
      { ...props, class: ['w-full rounded-t-xl bg-neutral-800 px-2 pt-2 pb-safe', extra] },
      div({ class: 'mx-auto mb-2 h-1 w-8 shrink-0 rounded-full bg-neutral-700' }),
      ...children,
    ),
  )
