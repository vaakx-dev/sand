import { div, el, SPACE, type Child } from '@sand/dom'

export interface ListProps {
  title: Child
  action?: Child
}

export const projectList = ({ title, action }: ListProps, ...rows: Child[]) =>
  el(
    'section',
    { class: 'flex flex-col gap-2' },
    div({ class: 'flex min-h-8 items-center gap-3 px-1' }, el('h2', { class: 'min-w-0 flex-1 text-xs font-medium text-neutral-500' }, title), action ?? null),
    div({ class: 'flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800', style: { rowGap: SPACE.px } }, ...rows),
  )
