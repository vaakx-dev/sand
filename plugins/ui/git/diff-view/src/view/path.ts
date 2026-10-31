import { span } from '@vaakx-dev/vrui'

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
