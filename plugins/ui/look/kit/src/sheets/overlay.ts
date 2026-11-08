import { div, event, read, show, sig, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { iconButton } from '../buttons/button'
import { closeButton } from '../buttons/close'
import { paneHead } from '../heads/page-head'
import { sheetTitle } from '../heads/text'
import { icon } from '../icons/lucide'
import { stableGutter } from '../scroll/gutter'
import { floatingEdge } from '../surface'
import { scrim } from './scrim'

export type SheetSize = 'sm' | 'md' | 'lg'

export type SheetProps = Props<HTMLDivElement> & {
  size?: SheetSize
  phone?: 'sheet' | 'screen'
  grab?: () => void
}

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

export const overlay = backdrop('items-end pt-12 sm:items-start sm:justify-center sm:px-3 sm:pt-20 sm:pb-3')

export const railOverlay = backdrop('items-end pt-12 sm:items-start sm:justify-center sm:px-3 sm:pb-3 md:items-end md:justify-start md:pt-3 md:pl-16')

export const screenOverlay = backdrop('pt-safe sm:items-start sm:justify-center sm:px-3 sm:pt-20 sm:pb-3')

const phoneFrames = {
  sheet: 'max-h-full rounded-t-xl bg-neutral-800 animate-rise',
  screen: 'h-full bg-neutral-900 animate-fade sm:h-auto sm:max-h-full sm:bg-neutral-800',
}

const dragDown = (close: () => void) => {
  const offset = sig(0)
  let start: number | undefined
  const release = () => {
    if (start === undefined) return
    start = undefined
    if (offset.get() > 80) close()
    else offset.set(0)
  }
  const handle = div(
    {
      class: 'flex h-5 shrink-0 cursor-grab touch-none items-center justify-center sm:hidden',
      onPointerDown: (pressed: PointerEvent) => {
        start = pressed.clientY
        if (pressed.target instanceof Element) pressed.target.setPointerCapture(pressed.pointerId)
      },
      onPointerMove: (moved: PointerEvent) => {
        if (start !== undefined) offset.set(Math.max(0, moved.clientY - start))
      },
      onPointerUp: release,
      onPointerCancel: release,
    },
    div({ class: 'h-1 w-8 rounded-full bg-neutral-600' }),
  )
  return { handle, style: () => (offset.get() ? { transform: `translateY(${offset.get()}px)` } : {}) }
}

export const sheet = ({ size = 'lg', phone = 'sheet', grab, class: extra, ...props }: SheetProps, ...children: Child[]) => {
  const drag = grab ? dragDown(grab) : undefined
  return div(
    {
      role: 'dialog',
      ...(drag && { style: drag.style }),
      ...props,
      class: ['flex w-full flex-col overflow-hidden pb-safe sm:rounded-xl sm:pb-0 sm:animate-none', phoneFrames[phone], floatingEdge, sheetWidths[size], extra],
    },
    drag?.handle ?? null,
    ...children,
  )
}

export const sheetHead = ({ title, close, back, backShown = true, actions }: SheetHeadProps) => {
  const led = () => Boolean(back) && read(backShown)
  return paneHead(
    { led, class: 'overflow-hidden', style: stableGutter },
    back ? show(led, () => iconButton({ title: 'Back', 'aria-label': 'Back', surface: 'raised', onClick: back }, icon('back', 'md'))) : null,
    sheetTitle(title),
    actions ?? null,
    close ? closeButton({ surface: 'raised', onClick: close }) : null,
  )
}

export const sheetBody = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div({ style: stableGutter, ...props, class: ['flex min-h-0 flex-col gap-4 overflow-auto px-4 pt-1 pb-4', extra] }, ...children)

export const sheetFoot = (...children: Child[]) =>
  div({ class: 'flex shrink-0 items-center justify-end gap-2 overflow-hidden px-4 py-3', style: stableGutter }, ...children)

export const sheetStep = (body: Child, ...foot: Child[]) =>
  div({ class: 'flex min-h-0 flex-1 flex-col' }, sheetBody({}, body), foot.length ? sheetFoot(...foot) : null)
