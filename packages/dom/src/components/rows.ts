import { div, list, span, type Child, type Derive, type Props, type Sig } from '@vaakx-dev/vrui'
import { hint } from './marks'

export const rowList = <T, K>(items: Sig<T[]> | Derive<T[]>, key: (item: T) => K, row: (item: Sig<T>) => HTMLElement) =>
  list(items, key, row, div({ class: 'contents' }))

export const hintRow = (...children: Child[]) => div({ class: 'bg-neutral-900' }, hint(...children))

export const itemRow = (props: Props<HTMLDivElement>, mark: Child, title: Child, detail: Child, ...controls: Child[]) =>
  div(
    { ...props, class: 'flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 bg-neutral-900 px-4 py-3' },
    mark,
    div(
      { class: 'flex min-w-32 flex-1 flex-col' },
      span({ class: 'truncate text-sm font-medium text-neutral-100' }, title),
      div({ class: 'text-xs text-neutral-500' }, detail),
    ),
    controls.length ? div({ class: 'flex shrink-0 flex-wrap items-center gap-3' }, ...controls) : null,
  )

export const sectionRow = (props: Props<HTMLDivElement>, ...children: Child[]) =>
  div({ ...props, class: 'flex items-start gap-3 bg-neutral-900 px-4 py-3' }, ...children)

export const rowWarning = (text: Child, ...actions: Child[]) =>
  div(
    { class: 'mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-warning-950 px-3 py-2' },
    span({ class: 'min-w-0 flex-1 text-xs text-warning-400' }, text),
    ...actions,
  )
