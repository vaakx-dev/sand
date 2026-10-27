import { modal } from '../layers/stack'
import { div, event, read, show, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { iconButton } from '../buttons/button'
import { closeButton } from '../buttons/close'
import { headTitle, paneHead } from '../heads/page-head'
import { icon } from '../icons/lucide'
import { layer } from '../layer'

export type SheetSize = 'sm' | 'md' | 'lg'

export type SheetProps = Props<HTMLDivElement> & { size?: SheetSize }

export interface SheetHeadProps {
  title: Child
  close?: () => void
  back?: () => void
  backShown?: MaybeReactive<boolean>
  actions?: Child
}

const sheetWidths: Record<SheetSize, string> = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-xl' }

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

export const sheet = ({ size = 'lg', class: extra, ...props }: SheetProps, ...children: Child[]) =>
  div(
    {
      role: 'dialog',
      ...props,
      class: ['flex max-h-full w-full flex-col overflow-hidden rounded-xl bg-neutral-800 shadow-xl', sheetWidths[size], extra],
    },
    ...children,
  )

export const sheetHead = ({ title, close, back, backShown = true, actions }: SheetHeadProps) => {
  const led = () => Boolean(back) && read(backShown)
  return paneHead(
    { led },
    back ? show(led, () => iconButton({ title: 'Back', 'aria-label': 'Back', surface: 'raised', onClick: back }, icon('back', 'md'))) : null,
    headTitle(2, title),
    actions ?? null,
    close ? closeButton({ surface: 'raised', onClick: close }) : null,
  )
}

export const sheetBody = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div({ ...props, class: ['flex min-h-0 flex-col gap-4 overflow-auto px-4 pt-1 pb-4', extra] }, ...children)

export const sheetFoot = (...children: Child[]) =>
  div({ class: 'flex shrink-0 items-center justify-end gap-2 border-t border-neutral-700 px-4 py-3' }, ...children)

export const sheetStep = (body: Child, ...foot: Child[]) =>
  div({ class: 'flex min-h-0 flex-1 flex-col' }, sheetBody({}, body), foot.length ? sheetFoot(...foot) : null)
