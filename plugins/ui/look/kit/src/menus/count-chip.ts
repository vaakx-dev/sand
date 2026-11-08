import type { Child, MaybeReactive } from '@vaakx-dev/vrui'
import { countMark } from '../heads/text'
import { chipButton } from './chip'
import { dropdown } from './dropdown'

export interface CountChipProps {
  label: Child
  count: MaybeReactive<number>
  items(close: () => void): Child[]
  lead?: Child
  placement?: 'above-left' | 'above-right'
}

export const countChip = ({ label, count, items, lead, placement = 'above-left' }: CountChipProps) =>
  dropdown({
    placement,
    flat: true,
    items,
    menuClass: 'w-80 max-h-80 overflow-y-auto *:first:pt-1.5',
    trigger: (press, open) => chipButton({ ...press, active: open }, lead ?? null, label, countMark(count)),
  })
