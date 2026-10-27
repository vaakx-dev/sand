import { div, read, section, span, type Child, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'
import { quietButton } from '../buttons/button'
import { sectionHeading } from '../heads/section-heading'

export interface SectionProps {
  title?: Child
  action?: Child
}

export interface Choice<T> {
  value: T
  label: string
  title?: string
  disabled?: boolean
  mark?: Child
}

export const settingsSection = ({ title, action }: SectionProps, ...rows: Child[]) =>
  section(
    { class: 'flex flex-col gap-2' },
    title || action ? div({ class: 'px-2' }, sectionHeading(span({ class: 'min-w-0 flex-1 truncate' }, title ?? ''), action ?? null)) : null,
    div({ class: 'flex flex-col gap-y-px overflow-hidden rounded-xl bg-neutral-700' }, ...rows),
  )

export interface SegmentedOptions {
  label?: string
  inset?: boolean
  fill?: boolean
  class?: ClassValue
}

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
      quietButton(
        {
          size: 'sm',
          surface: inset ? 'page' : 'raised',
          role: 'radio',
          'aria-checked': () => String(read(active) === choice.value),
          active: () => read(active) === choice.value,
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
