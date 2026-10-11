import { div, preventThen, show, sig, type Child, type ClassValue, type Sig } from '@vaakx-dev/vrui'
import { popover } from './menu'

export type Placement = 'below-left' | 'below-right' | 'above-left' | 'above-right'

export interface DropdownProps {
  trigger(toggle: () => void, open: Sig<boolean>): HTMLElement
  items(close: () => void): Child[]
  placement?: Placement
  keepFocus?: boolean
  class?: ClassValue
  menuClass?: ClassValue
}

const anchors: Record<Placement, string> = {
  'below-left': 'top-full left-0 mt-1',
  'below-right': 'top-full right-0 mt-1',
  'above-left': 'bottom-full left-0 mb-2',
  'above-right': 'bottom-full right-0 mb-2',
}

export const dropdown = ({ trigger, items, placement = 'below-left', keepFocus = false, class: extra, menuClass }: DropdownProps) => {
  const open = sig(false)
  const close = () => open.set(false)
  return div(
    { class: ['relative flex min-w-0', extra], onMouseDown: keepFocus ? preventThen() : undefined },
    trigger(open.toggle(), open),
    show(open, () => popover(close, { class: [anchors[placement], menuClass] }, ...items(close))),
  )
}
