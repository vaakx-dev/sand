import { div, type Child, type Props } from '@vaakx-dev/vrui'
import { stableGutter } from '../scroll/gutter'
import { secondaryText } from './text'

export type PageBodyProps = Props<HTMLDivElement> & {
  intro?: Child
}

export const pageBody = ({ intro, class: extra, ...props }: PageBodyProps, ...children: Child[]) =>
  div(
    { style: stableGutter, ...props, class: ['min-h-0 flex-1 overflow-auto overscroll-contain', extra] },
    div(
      { class: 'mx-auto w-full max-w-2xl px-4 pt-6 pb-12 sm:px-8' },
      intro ? div({ class: 'mb-8 min-w-0' }, secondaryText(intro)) : null,
      div({ class: 'flex min-w-0 flex-col gap-8' }, ...children),
    ),
  )
