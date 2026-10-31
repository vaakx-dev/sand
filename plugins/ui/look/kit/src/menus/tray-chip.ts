import type { Child, Props, Sig } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { pressOpens } from '../layers/outside'

export type TrayChipProps = Props<HTMLButtonElement> & { open: Sig<boolean>; toggle(): void }

export const trayChip = ({ open, toggle, class: extra, ...props }: TrayChipProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      ...pressOpens(open, toggle),
      class: [
        'flex min-w-0 items-center gap-1.5 rounded-md px-1 text-xs transition-colors',
        () => (open.get() ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-100'),
        extra,
      ],
    },
    ...children,
  )
