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
  item?: string
}

const marks: Record<StepState, (kit: Kit, name?: string) => HTMLElement> = {
  done: ({ icon }, name = 'check') => span({ class: 'inline-flex text-neutral-500' }, icon(name, 'xs')),
  failed: ({ icon }, name = 'x') => span({ class: 'inline-flex text-danger-400' }, icon(name, 'xs')),
  running: ({ spinner }) => spinner('xs'),
}

export const stepMark = (kit: Kit, state: StepState, name?: string) => marks[state](kit, name)

export const stepBody = (...content: Child[]) => div({ class: 'mt-1 mb-3 min-w-0 text-xs sm:pl-5' }, ...content)

export const stepLine = ({ rowButton }: Kit, { mark, label, title = '', meta, actions, expanded, onToggle, headProps, item }: StepLineProps, ...body: Child[]) =>
  div(
    { class: 'group', 'data-item': item },
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
        span({ class: 'flex min-w-0 items-baseline gap-2' }, label),
        meta,
      ),
      actions && actionRow(() => read(expanded), '', actions),
    ),
    ...body,
  )
