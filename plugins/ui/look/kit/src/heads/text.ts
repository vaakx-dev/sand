import { h1, h2, h3, p, read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'

export const pageTitleLook = 'min-w-0 text-xl font-semibold tracking-tight text-neutral-100'

export const pageTitle = (...children: Child[]) => h2({ class: pageTitleLook }, ...children)

const barTitleLook = 'min-w-0 flex-1 truncate text-sm font-medium text-neutral-100'

export const barTitle = (...children: Child[]) => h1({ class: barTitleLook }, ...children)

export const sheetTitle = (...children: Child[]) => h2({ class: barTitleLook }, ...children)

export const sectionTitle = (...children: Child[]) => h3({ class: 'min-w-0 text-sm font-semibold text-neutral-100' }, ...children)

export const secondaryLook = 'text-sm text-neutral-400'

export const secondaryText = (...children: Child[]) => p({ class: secondaryLook }, ...children)

export const rowTitle = (...children: Child[]) => span({ class: 'min-w-0 truncate text-sm group-aria-current:font-medium' }, ...children)

export const metaLook = 'text-xs text-neutral-500'

export const metaLine = (...children: Child[]) => span({ class: ['min-w-0 truncate', metaLook] }, ...children)

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

export const countMark = (value: MaybeReactive<number>) => span({ class: ['shrink-0 font-normal tabular-nums', metaLook] }, () => String(read(value)))
