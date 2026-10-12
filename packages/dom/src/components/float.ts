import type { Child, Props } from '@vaakx-dev/vrui'
import { plainButton } from './button'

export type FloatProps = Props<HTMLButtonElement> & { size?: 'sm' | 'md' }

export const floatButton = ({ size = 'md', class: extra, ...props }: FloatProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 shadow-lg ring-1 ring-neutral-700 transition-colors hover:bg-neutral-700 hover:text-neutral-100',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        extra,
      ],
    },
    ...children,
  )
