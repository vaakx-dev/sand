import { read, SPACE, span, type Child, type ClassValue, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { plainButton, quietLook } from '../buttons/button'
import { icon } from '../icons/lucide'
import { popover } from './menu'

export type ChipProps = Props<HTMLButtonElement> & { active: MaybeReactive<boolean>; menu?: boolean; warning?: MaybeReactive<boolean> }

export interface ChipPopoverProps {
  class: ClassValue
  width?: string
}

export const chipButton = ({ active, menu = false, warning = false, class: extra, ...props }: ChipProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs transition-colors',
        quietLook(active, () => (read(warning) ? 'text-warning-400' : 'text-neutral-500')),
        extra,
      ],
    },
    ...children,
    menu ? span({ class: 'inline-flex shrink-0' }, icon('down', 12)) : null,
  )

export const chipPopover = (close: () => void, { class: place, width }: ChipPopoverProps, ...children: Child[]) =>
  popover(
    close,
    { class: ['bottom-full mb-2 max-w-full overflow-auto', width ? '' : 'w-80', place], style: { width, maxHeight: `calc(100vh - ${SPACE['32']})` } },
    ...children,
  )
