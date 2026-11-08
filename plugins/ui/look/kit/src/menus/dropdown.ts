import { popupTrigger } from '../layers/outside'
import { div, preventThen, resizeObserver, show, sig, type Child, type ClassValue, type Sig } from '@vaakx-dev/vrui'
import { popover } from './menu'

export type Placement = 'below-left' | 'below-right' | 'above-left' | 'above-right'

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

const anchors: Record<Placement, string> = {
  'below-left': 'top-full left-0 mt-1',
  'below-right': 'top-full right-0 mt-1',
  'above-left': 'bottom-full left-0 mb-2',
  'above-right': 'bottom-full right-0 mb-2',
}

const margin = 8

const shiftOnScreen = (node: HTMLElement, shift: number) => {
  const { left, right } = node.getBoundingClientRect()
  const base = left - shift
  const width = right - left
  return Math.max(margin, Math.min(base, innerWidth - width - margin)) - base
}

export const dropdown = ({ trigger, items, placement = 'below-left', keepFocus = false, class: extra, menuClass, flat }: DropdownProps) => {
  const open = sig(false)
  const close = () => open.set(false)
  return div(
    { class: ['relative flex min-w-0', extra], onMouseDown: keepFocus ? preventThen() : undefined },
    trigger(triggerProps(open), open),
    show(open, () => {
      const shift = sig(0)
      return popover(
        close,
        {
          flat,
          class: [anchors[placement], 'w-max max-w-80', menuClass],
          style: () => ({ translate: `${shift.get()}px 0` }),
          onMount: node => {
            resizeObserver(node, () => shift.set(shiftOnScreen(node, shift.get())))
          },
        },
        ...items(close),
      )
    }),
  )
}
