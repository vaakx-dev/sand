import { read, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { rowButton } from './button'

export type PaneRowProps = Props<HTMLButtonElement> & { selected?: MaybeReactive<boolean> }

export const paneRow = ({ selected = false, class: extra, ...props }: PaneRowProps, ...children: Child[]) =>
  rowButton(
    {
      ...props,
      class: ['h-8 gap-2 rounded-lg px-2 text-sm text-neutral-100', () => (read(selected) ? 'bg-neutral-700' : 'hover:bg-neutral-800'), extra],
    },
    ...children,
  )
