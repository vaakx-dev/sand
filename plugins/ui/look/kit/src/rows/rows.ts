import { div, list, span, type Child, type Derive, type Props, type Sig } from '@vaakx-dev/vrui'
import { secondaryAction } from '../buttons/button'
import { hint } from '../marks/marks'
import { callout, errorText } from '../notes/notes'

const rowShell = 'min-h-12 gap-3 bg-neutral-900 px-4 py-2'

export const rowFrame = ['flex flex-wrap items-center', rowShell]

export const rowLabel = (title: Child, detail?: Child, clip = false) =>
  div(
    { class: 'flex min-w-24 flex-1 flex-col' },
    span({ class: ['text-sm font-medium text-neutral-100', clip && 'truncate'] }, title),
    detail ? div({ class: 'text-xs text-neutral-500' }, detail) : null,
  )

export const rowList = <T, K>(items: Sig<T[]> | Derive<T[]>, key: (item: T) => K, row: (item: Sig<T>) => HTMLElement) =>
  list(items, key, row, div({ class: 'contents' }))

export const hintRow = (...children: Child[]) => div({ class: 'bg-neutral-900' }, hint(...children))

export const itemRow = (props: Props<HTMLDivElement>, mark: Child, title: Child, detail: Child, ...controls: Child[]) =>
  div(
    { ...props, class: rowFrame },
    mark,
    rowLabel(title, detail, true),
    controls.length ? div({ class: 'flex shrink-0 flex-wrap items-center gap-3' }, ...controls) : null,
  )

export const sectionRow = (props: Props<HTMLDivElement>, ...children: Child[]) => div({ ...props, class: ['flex items-start', rowShell] }, ...children)

export const errorRow = (text: Child, retry?: () => void) =>
  div(
    { class: rowFrame },
    div({ class: 'min-w-0 flex-1' }, errorText(text)),
    retry ? secondaryAction({ size: 'sm', onClick: retry }, 'Retry') : null,
  )

export const rowWarning = (text: Child, ...actions: Child[]) =>
  div(
    { class: 'px-4 pb-3' },
    callout('warning', span({ class: 'min-w-0 flex-1' }, text), actions.length ? div({ class: 'flex shrink-0 flex-wrap items-center gap-2' }, ...actions) : null),
  )
