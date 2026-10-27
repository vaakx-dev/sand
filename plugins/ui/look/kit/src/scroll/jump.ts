import { div, type Sig } from '@vaakx-dev/vrui'
import { floatButton } from '../buttons/float'
import { icon } from '../icons/lucide'
import { layer } from '../layer'

export const jumpButton = (shown: Sig<boolean>, jump: () => void) =>
  div(
    {
      class: [layer.sticky, 'pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-3'],
      style: { bottom: 'var(--dock-h, 0px)' },
      hidden: shown.map(value => !value),
    },
    floatButton({ size: 'sm', title: 'Jump to latest', 'aria-label': 'Jump to latest', class: 'pointer-events-auto', onClick: jump }, icon('down', 'md')),
  )
