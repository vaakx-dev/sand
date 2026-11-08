import { read, SPACE, span, type Child, type ClassValue, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { icon } from '../icons/lucide'
import { popover } from './menu'

export type ChipProps = Props<HTMLButtonElement> & { active: MaybeReactive<boolean>; menu?: boolean; warning?: MaybeReactive<boolean> }

export interface ChipPopoverProps {
  class: ClassValue
  width?: string
}

export const chipButton = ({ active, menu = false, warning = false, class: extra, ...props }: ChipProps, ...children: Child[]) => {
  const idle = () => (read(warning) ? 'text-warning-400' : 'text-neutral-400')
  return plainButton(
    {
      ...props,
      class: [
        'inline-flex h-6 min-w-0 items-center gap-1.5 rounded-full px-3 text-xs transition-colors hover:bg-neutral-800 hover:text-neutral-100',
        () => (read(active) ? 'bg-neutral-800 text-neutral-100' : idle()),
        extra,
      ],
    },
    ...children,
    menu ? span({ class: 'inline-flex shrink-0' }, icon('down', 'sm')) : null,
  )
}

export const chipPopover = (close: () => void, { class: place, width }: ChipPopoverProps, ...children: Child[]) =>
  popover(
    close,
    { class: ['bottom-full mb-2 overflow-auto', width ? '' : 'w-80', place], style: { width, maxWidth: `calc(100vw - ${SPACE['8']})`, maxHeight: `calc(100vh - ${SPACE['32']})` } },
    ...children,
  )
