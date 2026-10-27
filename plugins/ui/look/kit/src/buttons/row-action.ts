import { onPressOutside } from '../layers/outside'
import { placeLook } from '../surface'
import { sig, stopThen, type Sig } from '@vaakx-dev/vrui'
import { controlButton } from './button'

export interface RowActionProps {
  label: string
  danger?: boolean
  disabled?: () => boolean
  run(): void
}

const dangerLook = (armed: Sig<boolean>) => () => (armed.get() ? 'bg-danger-950 text-danger-400' : 'text-danger-400 hover:bg-neutral-700')

export const rowAction = ({ label, danger, disabled, run }: RowActionProps) => {
  const armed = sig(false)
  return controlButton(
    danger ? dangerLook(armed) : placeLook(false, 'group'),
    {
      size: 'sm',
      disabled,
      onClick: stopThen(() => {
        if (danger && !armed.get()) return armed.set(true)
        run()
      }),
      onMouseLeave: () => armed.set(false),
      onMount: node => onPressOutside(node, () => armed.set(false)),
    },
    () => (armed.get() ? `${label}?` : label),
  )
}
