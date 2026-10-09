import { div, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { rowButton } from './button'

export interface ChoiceProps {
  mark: Child
  title: Child
  detail?: Child
  chip?: Child
  disabled?: MaybeReactive<boolean>
  onClick(): void
}

export const tile = (...children: Child[]) =>
  span({ class: 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-700 text-neutral-200' }, ...children)

export const choiceButton = ({ mark, title, detail, chip, disabled, onClick }: ChoiceProps) =>
  rowButton(
    {
      class: 'gap-3 rounded-xl bg-neutral-900 px-4 py-3 ring-1 ring-neutral-700 transition hover:ring-neutral-500',
      ...(disabled !== undefined && { disabled }),
      onClick,
    },
    mark,
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'text-sm font-medium text-neutral-100' }, title),
      detail ? span({ class: 'text-xs text-neutral-500' }, detail) : null,
    ),
    chip ?? null,
  )

export const choiceList = (...children: Child[]) => div({ class: 'flex flex-col gap-2' }, ...children)
