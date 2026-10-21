import type { PickItem, PickTone } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, span, type Sig } from '@vaakx-dev/vrui'
import type { PickModel } from './model'

const tones: Record<PickTone, string> = {
  accent: 'text-accent-400',
  warning: 'text-warning-400',
  error: 'text-danger-400',
}

export const row = <T>({ optionProps }: Kit, item: PickItem<T>, position: Sig<number>, { box }: PickModel<T>) =>
  div(
    {
      ...optionProps(box, position),
      class: [
        'flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-sm cursor-pointer',
        () => (box.isSelected(position.get()) ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100'),
      ],
    },
    span({ class: ['min-w-0 flex-1 truncate', item.tone && tones[item.tone]], title: item.label }, item.label),
    item.detail && span({ class: 'max-w-48 shrink-0 truncate text-xs text-neutral-500 tabular-nums', title: item.detail }, item.detail),
  )
