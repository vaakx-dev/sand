import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, sig } from '@vaakx-dev/vrui'

export const removeButton = (kit: Kit, label: string, run: () => void) => {
  const { controlButton, icon, iconButton, onPressOutside } = kit
  const armed = sig(false)
  return dynamicChild(armed, on =>
    on
      ? controlButton(
          'bg-danger-950 text-danger-400',
          {
            size: 'sm',
            onClick: () => {
              armed.set(false)
              run()
            },
            onMount: node => onPressOutside(node, () => armed.set(false)),
          },
          `${label}?`,
        )
      : iconButton({ size: 'sm', surface: 'group', title: label, 'aria-label': label, onClick: () => armed.set(true) }, icon('trash', 'sm')),
  )
}
