import { div, h2, read, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { pageTitleLook, secondaryText, sheetTitle } from './text'

export const pageColumn = 'mx-auto w-full max-w-3xl'

type PaneHeadProps = Props<HTMLDivElement> & { led?: MaybeReactive<boolean> }

export const pageHead = (caption?: Child, action?: Child) =>
  div(
    { class: 'flex flex-wrap items-center justify-end gap-3' },
    caption ? div({ class: 'min-w-48 flex-1' }, secondaryText(caption)) : null,
    action ?? null,
  )

export const paneHead = ({ led = false, class: extra, ...props }: PaneHeadProps, ...children: Child[]) =>
  div({ ...props, class: ['flex h-12 shrink-0 items-center gap-2 pr-3', () => (read(led) ? 'pl-2' : 'pl-4'), extra] }, ...children)

export const headTitle = (level: 1 | 2, title: Child) => (level === 1 ? h2({ class: [pageTitleLook, 'flex-1 truncate'] }, title) : sheetTitle(title))
