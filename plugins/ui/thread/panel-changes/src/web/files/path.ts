import { span } from '@sand/dom'

const cut = (path: string) => path.lastIndexOf('/') + 1

export const folderOf = (path: string) => path.slice(0, cut(path))

export const nameOf = (path: string) => path.slice(cut(path))

export const pathLabel = (path: () => string) =>
  span(
    { class: 'flex min-w-0 font-mono' },
    span({ class: 'min-w-0 truncate text-neutral-500' }, () => folderOf(path())),
    span({ class: 'max-w-full shrink-0 truncate text-neutral-100' }, () => nameOf(path())),
  )
