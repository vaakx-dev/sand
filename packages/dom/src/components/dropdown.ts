import { div, preventThen, show, sig, type Child, type ClassValue, type Sig, type StyleMap } from '@vaakx-dev/vrui'
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

const anchors: Record<Placement, { class: string; style: StyleMap }> = {
  'below-left': { class: 'mt-1', style: { top: '100%', left: '0' } },
  'below-right': { class: 'mt-1', style: { top: '100%', right: '0' } },
  'above-left': { class: 'mb-2', style: { bottom: '100%', left: '0' } },
  'above-right': { class: 'mb-2', style: { bottom: '100%', right: '0' } },
}

export const dropdown = ({ trigger, items, placement = 'below-left', keepFocus = false, class: extra, menuClass }: DropdownProps) => {
  const open = sig(false)
  const close = () => open.set(false)
  const anchor = anchors[placement]
  return div(
    { class: ['relative flex min-w-0', extra], onMouseDown: keepFocus ? preventThen() : undefined },
    trigger(() => open.set(!open.get()), open),
    show(open, () => popover(close, { class: [anchor.class, menuClass], style: anchor.style }, ...items(close))),
  )
}
