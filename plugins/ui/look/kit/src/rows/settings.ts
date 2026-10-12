import { div, h2, read, section, type Child, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'
import { quietButton } from '../buttons/button'
import { rowFrame, rowLabel } from './rows'

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
    title || action
      ? div({ class: 'flex min-h-8 items-center gap-3 px-1' }, h2({ class: 'min-w-0 flex-1 text-xs font-medium text-neutral-500' }, title ?? ''), action ?? null)
      : null,
    div({ class: 'flex flex-col gap-y-px rounded-xl *:first:rounded-t-xl *:last:rounded-b-xl border border-neutral-800 bg-neutral-800' }, ...rows),
  )

export const settingsRow = (label: Child, control?: Child, detail?: Child) =>
  div({ class: rowFrame }, rowLabel(label, detail), control ? div({ class: 'flex shrink-0 items-center gap-2' }, control) : null)

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
      class: ['flex flex-wrap gap-1 rounded-lg p-1', inset ? 'bg-neutral-900' : 'bg-neutral-800', extra],
      role: 'radiogroup',
      ...(label && { 'aria-label': label }),
    },
    choices.map(choice =>
      quietButton(
        {
          size: 'sm',
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
