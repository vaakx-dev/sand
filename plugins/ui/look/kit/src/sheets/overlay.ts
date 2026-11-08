import { div, event, read, show, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { iconButton } from '../buttons/button'
import { closeButton } from '../buttons/close'
import { headTitle, paneHead } from '../heads/page-head'
import { icon } from '../icons/lucide'
import { stableGutter } from '../scroll/gutter'
import { scrim } from './scrim'

export type SheetSize = 'sm' | 'md' | 'lg'

export type SheetProps = Props<HTMLDivElement> & { size?: SheetSize }

export interface SheetHeadProps {
  title: Child
  close?: () => void
  back?: () => void
  backShown?: MaybeReactive<boolean>
  actions?: Child
}

const sheetWidths: Record<SheetSize, string> = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-xl' }

const backdrop =
  (placement: string) =>
  (close: () => void, ...children: Child[]) =>
    scrim({ close, from: document.activeElement, class: placement, onMouseDown: event(close, { self: true }) }, ...children)

export const overlay = backdrop('items-end sm:items-start sm:justify-center sm:px-3 sm:pt-20 sm:pb-3')

export const railOverlay = backdrop('items-end sm:items-start sm:justify-center sm:px-3 sm:pb-3 md:items-end md:justify-start md:pt-3 md:pl-16')

export const sheet = ({ size = 'lg', class: extra, ...props }: SheetProps, ...children: Child[]) =>
  div(
    {
      role: 'dialog',
      ...props,
      class: [
        'flex max-h-full w-full flex-col overflow-hidden rounded-t-xl bg-neutral-800 pb-safe shadow-xl ring-1 ring-neutral-700 animate-rise sm:rounded-xl sm:pb-0 sm:animate-none',
        sheetWidths[size],
        extra,
      ],
    },
    ...children,
  )

export const sheetHead = ({ title, close, back, backShown = true, actions }: SheetHeadProps) => {
  const led = () => Boolean(back) && read(backShown)
  return paneHead(
    { led, class: 'overflow-hidden border-b border-neutral-700', style: stableGutter },
    back ? show(led, () => iconButton({ title: 'Back', 'aria-label': 'Back', surface: 'raised', onClick: back }, icon('back', 'md'))) : null,
    headTitle(2, title),
    actions ?? null,
    close ? closeButton({ surface: 'raised', onClick: close }) : null,
  )
}

export const sheetBody = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div({ style: stableGutter, ...props, class: ['flex min-h-0 flex-col gap-4 overflow-auto px-4 pt-1 pb-4', extra] }, ...children)

export const sheetFoot = (...children: Child[]) =>
  div({ class: 'flex shrink-0 items-center justify-end gap-2 overflow-hidden border-t border-neutral-700 px-4 py-3', style: stableGutter }, ...children)

export const sheetStep = (body: Child, ...foot: Child[]) =>
  div({ class: 'flex min-h-0 flex-1 flex-col' }, sheetBody({}, body), foot.length ? sheetFoot(...foot) : null)
