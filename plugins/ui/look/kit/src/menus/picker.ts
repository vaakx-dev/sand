import { read, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { icon } from '../icons/lucide'

const fieldSurface = 'bg-neutral-950'

const pickedFill = 'bg-neutral-700 text-neutral-100'

export const pickerLook = (active: MaybeReactive<boolean>, idle: MaybeReactive<string>) => [
  fieldSurface,
  'rounded-lg text-xs transition-colors hover:bg-neutral-700 hover:text-neutral-100 aria-expanded:bg-neutral-700 aria-expanded:text-neutral-100',
  idle,
  () => (read(active) ? pickedFill : ''),
]

export type PickerButtonProps = Props<HTMLButtonElement> & { active?: MaybeReactive<boolean> }

export const pickerButton = ({ active = false, class: extra, ...props }: PickerButtonProps, ...children: Child[]) =>
  plainButton(
    { ...props, class: ['inline-flex h-8 min-w-0 items-center gap-2 px-3', pickerLook(active, 'text-neutral-100'), extra] },
    ...children,
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 'sm')),
  )
