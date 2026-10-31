import { read, type MaybeReactive } from '@vaakx-dev/vrui'
import { checkMark } from '../marks/marks'
import { listRow, type ListRowProps } from './list-row'

export type CheckRowProps = Pick<ListRowProps, 'title' | 'meta' | 'trail' | 'surface' | 'touch'> & {
  checked: MaybeReactive<boolean>
  onToggle(): void
  disabled?: MaybeReactive<boolean>
}

export const checkRow = ({ checked, onToggle, disabled = false, ...props }: CheckRowProps) =>
  listRow({
    ...props,
    role: 'checkbox',
    'aria-checked': () => String(read(checked)),
    disabled,
    lead: checkMark(() => read(checked)),
    onClick: () => onToggle(),
  })
