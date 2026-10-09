import { sig, stopThen } from '@vaakx-dev/vrui'
import { controlButton } from './button'

export interface RowActionProps {
  label: string
  danger?: boolean
  disabled?: () => boolean
  run(): void
}

const tones = {
  plain: 'font-medium bg-neutral-600 text-neutral-200 hover:bg-neutral-500 hover:text-neutral-100',
  danger: 'font-medium bg-danger-950 text-danger-400 hover:bg-danger-900 hover:text-danger-300',
}

export const rowAction = ({ label, danger, disabled, run }: RowActionProps) => {
  const armed = sig(false)
  return controlButton(
    danger ? tones.danger : tones.plain,
    {
      size: 'sm',
      disabled,
      onClick: stopThen(() => {
        if (danger && !armed.get()) return armed.set(true)
        run()
      }),
      onMouseLeave: () => armed.set(false),
    },
    () => (armed.get() ? `${label}?` : label),
  )
}
