import { div, span, type Child, type Props } from '@vaakx-dev/vrui'
import { stableGutter } from '../scroll/gutter'
import { pageColumn } from './page-head'
import { pageTitle } from './text'

export type PageBodyProps = Omit<Props<HTMLDivElement>, 'title'> & {
  title?: Child
  action?: Child
}

const titleRow = (title: Child, action?: Child) =>
  div({ class: 'mb-6 flex min-w-0 flex-wrap items-center gap-3' }, pageTitle(title), action ? span({ class: 'ml-auto flex shrink-0 items-center gap-2' }, action) : null)

export const pageBody = ({ title, action, class: extra, ...props }: PageBodyProps, ...children: Child[]) =>
  div(
    { style: stableGutter, ...props, class: ['min-h-0 flex-1 overflow-auto overscroll-contain', extra] },
    div(
      { class: [pageColumn, 'px-4 py-6 sm:px-8'] },
      title ? titleRow(title, action) : null,
      div({ class: 'flex min-w-0 flex-col gap-8' }, ...children),
    ),
  )
