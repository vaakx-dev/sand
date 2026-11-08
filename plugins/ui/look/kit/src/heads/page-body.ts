import { div, span, type Child, type Props } from '@vaakx-dev/vrui'
import { stableGutter } from '../scroll/gutter'
import { pageTitle, secondaryText } from './text'

export type PageBodyProps = Omit<Props<HTMLDivElement>, 'title'> & {
  title?: Child
  lead?: Child
  intro?: Child
  action?: Child
}

const titleRow = (title: Child, lead?: Child, action?: Child) =>
  div(
    { class: 'flex min-w-0 flex-wrap items-center gap-2' },
    lead ?? null,
    pageTitle(title),
    action ? span({ class: 'ml-auto flex shrink-0 items-center gap-2' }, action) : null,
  )

const pageHeader = (title: Child, lead?: Child, intro?: Child, action?: Child) =>
  div({ class: 'mb-8 flex min-w-0 flex-col gap-1.5' }, titleRow(title, lead, action), intro ? secondaryText(intro) : null)

export const pageBody = ({ title, lead, intro, action, class: extra, ...props }: PageBodyProps, ...children: Child[]) =>
  div(
    { style: stableGutter, ...props, class: ['min-h-0 flex-1 overflow-auto overscroll-contain', extra] },
    div(
      { class: 'mx-auto w-full max-w-2xl px-4 pt-6 pb-12 sm:px-8' },
      title ? pageHeader(title, lead, intro, action) : null,
      div({ class: 'flex min-w-0 flex-col gap-8' }, ...children),
    ),
  )
