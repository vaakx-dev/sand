import { popupTrigger } from '../layers/outside'
import { div, onRaf, preventThen, resizeObserver, show, sig, type Child, type ClassValue, type Sig } from '@vaakx-dev/vrui'
import { popover } from './menu'

export type Placement = 'below-left' | 'below-right' | 'above-left' | 'above-right' | 'auto-left' | 'auto-right'

type Side = 'below' | 'above'
type Edge = 'left' | 'right'

const triggerProps = (open: Sig<boolean>) => ({ ...popupTrigger(open), onClick: open.toggle() })

export interface DropdownProps {
  trigger(press: ReturnType<typeof triggerProps>, open: Sig<boolean>): HTMLElement
  items(close: () => void): Child[]
  placement?: Placement
  keepFocus?: boolean
  class?: ClassValue
  menuClass?: ClassValue
  flat?: boolean
}

const edges: Record<Edge, string> = { left: 'left-0', right: 'right-0' }

const sides: Record<Side, Record<string, string>> = {
  below: { top: '100%', bottom: 'auto', marginTop: '0.25rem' },
  above: { bottom: '100%', top: 'auto', marginBottom: '0.5rem' },
}

const margin = 8

const roomOf = (anchor: HTMLElement) => {
  const { top, bottom } = anchor.getBoundingClientRect()
  return { above: top - margin * 2, below: innerHeight - bottom - margin * 2 }
}

const sideFor = (placement: Placement, anchor: HTMLElement, height: number): Side => {
  const [wanted] = placement.split('-') as [Side | 'auto']
  const room = roomOf(anchor)
  const other: Side = wanted === 'above' ? 'below' : 'above'
  if (wanted === 'auto') return room.above > room.below ? 'above' : 'below'
  return room[wanted] < height && room[other] > room[wanted] ? other : wanted
}

const shiftOnScreen = (node: HTMLElement, shift: number) => {
  const { left, right } = node.getBoundingClientRect()
  const base = left - shift
  const width = right - left
  return Math.max(margin, Math.min(base, innerWidth - width - margin)) - base
}

export const dropdown = ({ trigger, items, placement = 'below-left', keepFocus = false, class: extra, menuClass, flat }: DropdownProps) => {
  const open = sig(false)
  const close = () => open.set(false)
  const anchor: HTMLElement = div(
    { class: ['relative flex min-w-0', extra], onMouseDown: keepFocus ? preventThen() : undefined },
    trigger(triggerProps(open), open),
    show(open, () => {
      const shift = sig(0)
      const side = sig<Side>(placement.startsWith('above') ? 'above' : 'below')
      const room = sig<number | undefined>(undefined)
      const edge = placement.split('-')[1] as Edge
      return popover(
        close,
        {
          flat,
          class: [edges[edge], 'w-max max-w-80 overflow-y-auto', menuClass],
          style: () => ({ ...sides[side.get()], translate: `${shift.get()}px 0`, maxHeight: room.get() === undefined ? undefined : `${room.get()}px` }),
          onMount: node => {
            onRaf(() => {
              const chosen = sideFor(placement, anchor, node.scrollHeight)
              side.set(chosen)
              room.set(Math.max(0, roomOf(anchor)[chosen]))
            }, node)
            resizeObserver(node, () => shift.set(shiftOnScreen(node, shift.get())))
          },
        },
        ...items(close),
      )
    }),
  )
  return anchor
}
