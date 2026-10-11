import { event, read, SPACE, type Child, type ClassValue, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { plainButton } from './button'
import { popover } from './menu'

export type ChipProps = Props<HTMLButtonElement> & { active: MaybeReactive<boolean> }

export interface ChipPopoverProps {
  class: ClassValue
  width?: string
}

export const chipButton = ({ active, ...props }: ChipProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'inline-flex h-6 min-w-0 items-center gap-1 rounded-md px-2 text-xs transition-colors hover:bg-neutral-800 hover:text-neutral-200',
        () => (read(active) ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500'),
      ],
    },
    ...children,
  )

export const pressOpens = (toggle: () => void) => ({
  onMouseDown: event(toggle, { stop: true, prevent: true }),
  onClick: (click: MouseEvent) => {
    if (click.detail === 0) toggle()
  },
})

export const chipPopover = (close: () => void, { class: place, width }: ChipPopoverProps, ...children: Child[]) =>
  popover(close, { class: ['bottom-full mb-3 max-w-full overflow-auto', place], style: { width, maxHeight: `calc(100vh - ${SPACE['32']})` } }, ...children)
