import type { Kit } from '@sand/ui-kit/contract'
import { div, read, span, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { actionRow } from './row'

export type StepState = 'done' | 'failed' | 'running'

export interface StepLineProps {
  mark: Child
  label: Child
  title?: MaybeReactive<string>
  meta?: Child
  actions?: Child
  expanded: MaybeReactive<boolean>
  onToggle(): void
  headProps?: Props<HTMLDivElement>
}

const marks: Record<StepState, (kit: Kit) => HTMLElement> = {
  done: ({ icon }) => span({ class: 'inline-flex text-neutral-500' }, icon('check', 'xs')),
  failed: ({ icon }) => span({ class: 'inline-flex text-danger-400' }, icon('x', 'xs')),
  running: ({ spinner }) => spinner('xs'),
}

export const stepMark = (kit: Kit, state: StepState) => marks[state](kit)

export const stepBody = (...content: Child[]) => div({ class: 'mt-1 mb-2 min-w-0 text-xs' }, ...content)

export const stepLine = ({ rowButton }: Kit, { mark, label, title = '', meta, actions, expanded, onToggle, headProps }: StepLineProps, ...body: Child[]) =>
  div(
    { class: 'group' },
    div(
      { ...headProps, class: 'flex min-h-6 items-center gap-1' },
      rowButton(
        {
          'aria-expanded': () => String(read(expanded)),
          class: 'min-h-6 flex-1 gap-2 rounded-sm text-sm text-neutral-400 transition-colors hover:text-neutral-100 aria-expanded:text-neutral-100',
          title,
          onClick: onToggle,
        },
        span({ class: 'inline-flex w-3 shrink-0 justify-center' }, mark),
        span({ class: 'min-w-0 truncate' }, label),
        meta,
      ),
      actions && actionRow(() => read(expanded), '', actions),
    ),
    ...body,
  )
