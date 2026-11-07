import { div, h1, h2, p, read, type Child, type MaybeReactive, type Props } from '@vaakx-dev/vrui'

export const pageColumn = 'mx-auto w-full max-w-3xl'

type PaneHeadProps = Props<HTMLDivElement> & { led?: MaybeReactive<boolean> }

export const pageHead = (caption?: Child, action?: Child) =>
  div(
    { class: 'flex flex-wrap items-center justify-end gap-3' },
    caption ? p({ class: 'min-w-48 flex-1 text-sm text-neutral-400' }, caption) : null,
    action ?? null,
  )

export const paneHead = ({ led = false, class: extra, ...props }: PaneHeadProps, ...children: Child[]) =>
  div({ ...props, class: ['flex h-12 shrink-0 items-center gap-2 pr-3', () => (read(led) ? 'pl-2' : 'pl-4'), extra] }, ...children)

const titles = {
  1: { tag: h1, size: 'text-xl font-semibold' },
  2: { tag: h2, size: 'text-base font-medium' },
}

export const headTitle = (level: 1 | 2, title: Child) => {
  const { tag, size } = titles[level]
  return tag({ class: ['min-w-0 flex-1 truncate text-neutral-100', size] }, title)
}
