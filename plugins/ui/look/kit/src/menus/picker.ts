import { span, type Child, type Props } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { icon } from '../icons/lucide'

export type PickerButtonProps = Props<HTMLButtonElement> & { lead?: Child; field?: boolean }

export const pickerButton = ({ lead, field = false, class: extra, ...props }: PickerButtonProps, ...label: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'inline-flex h-8 max-w-full min-w-0 items-center gap-2 rounded-lg px-2 text-sm text-neutral-100 transition-colors hover:bg-neutral-700 aria-expanded:bg-neutral-700',
        field && 'min-w-40 bg-neutral-700/50',
        extra,
      ],
    },
    lead === undefined ? null : span({ class: 'inline-flex shrink-0 text-neutral-400' }, lead),
    span({ class: ['min-w-0 truncate text-left', field && 'flex-1'] }, ...label),
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 'xs')),
  )
