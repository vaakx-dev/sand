import { read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'

export const rowTitle = (...children: Child[]) => span({ class: 'min-w-0 truncate text-sm group-aria-current:font-medium' }, ...children)

export const metaLine = (...children: Child[]) => span({ class: 'min-w-0 truncate text-xs text-neutral-400' }, ...children)

const splitPath = (path: string) => {
  const cut = path.lastIndexOf('/') + 1
  return { folder: path.slice(0, cut), name: path.slice(cut) }
}

export const pathLabel = (path: () => string) =>
  span(
    { class: 'flex min-w-0', title: path },
    span({ class: 'min-w-0 truncate text-neutral-500' }, () => splitPath(path()).folder),
    span({ class: 'shrink-0 text-neutral-100' }, () => splitPath(path()).name),
  )

export const countMark = (value: MaybeReactive<number>) => span({ class: 'shrink-0 text-xs font-normal text-neutral-500 tabular-nums' }, () => String(read(value)))
