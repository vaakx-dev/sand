import { div, event, h2, type Child, type Props } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { layer, modal } from '../shell/layers'
import { iconButton } from './button'

export const overlay = (close: () => void, ...children: Child[]) => {
  const previous = document.activeElement
  return div(
    {
      class: [layer.dialog, 'fixed inset-0 flex items-start justify-center bg-black/50 px-3 pt-10 pb-3 animate-fade md:pt-20'],
      onMouseDown: event(close, { self: true }),
      onMount: node => modal(node, close, previous),
    },
    ...children,
  )
}

export const sheet = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div(
    {
      role: 'dialog',
      ...props,
      class: ['flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-neutral-800 shadow-xl ring-1 ring-neutral-700 animate-pop', extra],
    },
    ...children,
  )

export const sheetHead = (title: Child, close: () => void, ...extra: Child[]) =>
  div(
    { class: 'flex shrink-0 items-center gap-3 pt-3 pr-3 pb-1 pl-5' },
    h2({ class: 'min-w-0 flex-1 truncate text-sm font-semibold text-neutral-100' }, title),
    ...extra,
    iconButton({ title: 'Close', onClick: close }, icon('x')),
  )

export const drawer = (close: () => void, { class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) => {
  const previous = document.activeElement
  return div(
    {
      class: [layer.drawer, 'fixed inset-0 flex justify-end bg-black/50 animate-fade'],
      onMouseDown: event(close, { self: true }),
      onMount: node => modal(node, close, previous),
    },
    div(
      {
        role: 'dialog',
        ...props,
        class: ['flex h-full w-full max-w-lg flex-col bg-neutral-900 shadow-xl animate-slide', extra],
        style: { padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) 0' },
      },
      ...children,
    ),
  )
}
