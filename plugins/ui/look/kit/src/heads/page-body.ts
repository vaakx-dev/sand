import { div, type Child, type Props } from '@vaakx-dev/vrui'
import { stableGutter } from '../scroll/gutter'

export const bodyColumn = 'mx-auto w-full max-w-2xl px-4 sm:px-8'

export const pageBody = ({ class: extra, ...props }: Props<HTMLDivElement>, ...children: Child[]) =>
  div(
    { style: stableGutter, ...props, class: ['min-h-0 flex-1 overflow-auto overscroll-contain', extra] },
    div(
      { class: [bodyColumn, 'pt-6 pb-12'] },
      div({ class: 'flex min-w-0 flex-col gap-8' }, ...children),
    ),
  )
