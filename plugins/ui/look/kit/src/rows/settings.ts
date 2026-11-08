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

const picked = 'bg-neutral-700 text-neutral-100'

export const segmented = <T>(choices: Choice<T>[], active: MaybeReactive<T | undefined>, choose: (value: T) => void, { label, fill = false, class: extra }: SegmentedOptions = {}) =>
  div(
    {
      class: ['flex flex-wrap rounded-lg bg-neutral-950 p-px', extra],
      role: 'radiogroup',
      ...(label && { 'aria-label': label }),
    },
    choices.map(choice =>
      controlButton(
        ['gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-100', () => (read(active) === choice.value ? picked : '')],
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
