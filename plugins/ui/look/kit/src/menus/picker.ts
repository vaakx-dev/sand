import { span, type Child, type Props } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { icon } from '../icons/lucide'

export type PickerButtonProps = Props<HTMLButtonElement> & { lead?: Child }

export const pickerButton = ({ lead, class: extra, ...props }: PickerButtonProps, ...label: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'inline-flex h-8 max-w-full min-w-0 items-center gap-2 rounded-lg px-2 text-sm text-neutral-100 transition-colors hover:bg-neutral-700 aria-expanded:bg-neutral-700',
        extra,
      ],
    },
    lead === undefined ? null : span({ class: 'inline-flex shrink-0 text-neutral-400' }, lead),
    span({ class: 'min-w-0 truncate' }, ...label),
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 'xs')),
  )
