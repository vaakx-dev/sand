import { div, el, option, select, SPACE, span, type Child, type ClassValue, type MaybeReactive } from '@vaakx-dev/vrui'
import { icon } from '../icons/lucide'
import { read } from '../reactive/read'
import { quietButton } from './button'

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
  el(
    'section',
    { class: 'flex flex-col gap-2' },
    title || action
      ? div({ class: 'flex min-h-8 items-center gap-3 px-1' }, el('h2', { class: 'min-w-0 flex-1 text-xs font-medium text-neutral-500' }, title ?? ''), action ?? null)
      : null,
    div({ class: 'flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800', style: { rowGap: SPACE.px } }, ...rows),
  )

export const settingsRow = (label: Child, control?: Child, detail?: Child) =>
  div(
    { class: 'flex min-h-12 flex-wrap items-center gap-x-6 gap-y-2 bg-neutral-900 px-4 py-2' },
    div(
      { class: 'flex min-w-24 flex-1 flex-col' },
      span({ class: 'text-sm text-neutral-100' }, label),
      detail ? span({ class: 'text-xs text-neutral-500' }, detail) : null,
    ),
    control ? div({ class: 'flex shrink-0 items-center gap-2' }, control) : null,
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

export const selectMenu = <T extends string>(choices: Choice<T>[], active: MaybeReactive<T | undefined>, choose: (value: T) => void) =>
  div(
    { class: 'relative flex min-w-40' },
    select(
      {
        class: 'h-8 w-full appearance-none rounded-lg bg-neutral-800 pr-8 pl-3 text-sm text-neutral-100 cursor-pointer outline-none hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-accent-500',
        onChange: event => choose((event.target as HTMLSelectElement).value as T),
      },
      choices.map(choice => option({ value: choice.value, selected: () => read(active) === choice.value }, choice.label)),
    ),
    span({ class: 'pointer-events-none absolute inset-0 flex items-center justify-end pr-2 text-neutral-500' }, icon('down', 14)),
  )
