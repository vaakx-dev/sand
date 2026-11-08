import { div, read, type Child, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'
import { controlButton } from '../buttons/button'

export interface Choice<T> {
  value: T
  label: string
  title?: string
  disabled?: boolean
  mark?: Child
}

export interface SegmentedOptions {
  label?: string
  inset?: boolean
  fill?: boolean
  class?: ClassValue
}

const picked = (inset: boolean) => (inset ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-900 text-neutral-100 shadow-xs dark:bg-neutral-600')

export const segmented = <T>(
  choices: Choice<T>[],
  active: MaybeReactive<T | undefined>,
  choose: (value: T) => void,
  { label, inset = false, fill = false, class: extra }: SegmentedOptions = {},
) =>
  div(
    {
      class: ['flex flex-wrap gap-1 rounded-md p-1', inset ? 'bg-neutral-900' : 'bg-neutral-800', extra],
      role: 'radiogroup',
      ...(label && { 'aria-label': label }),
    },
    choices.map(choice =>
      controlButton(
        ['text-neutral-400 hover:text-neutral-100', () => (read(active) === choice.value ? picked(inset) : '')],
        {
          size: 'sm',
          role: 'radio',
          'aria-checked': () => String(read(active) === choice.value),
          ...(choice.title && { title: choice.title }),
          ...(choice.disabled && { disabled: true }),
          ...(fill && { class: 'flex-1' }),
          onClick: () => choose(choice.value),
        },
        choice.label,
        choice.mark ?? null,
      ),
    ),
  )
