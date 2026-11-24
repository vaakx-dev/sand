import { show } from '@vaakx-dev/vrui'
import { iconButton } from '../buttons/button'
import { icon } from '../icons/lucide'

export interface Reset {
  changed(): boolean
  run(): void
}

const label = 'Reset to default'

export const resetButton = ({ changed, run }: Reset) =>
  show(changed, () => iconButton({ size: 'sm', title: label, 'aria-label': label, class: 'text-neutral-500 hover:text-neutral-100', onClick: run }, icon('retry', 'xs')))
