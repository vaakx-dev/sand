import { div, hint, list, type Derive, type Sig } from '@sand/dom'

export const rows = <T, K>(items: Sig<T[]> | Derive<T[]>, key: (item: T) => K, row: (item: Sig<T>) => HTMLElement) =>
  list(items, key, row, div({ class: 'contents' }))

export const noteRow = (text: string) => div({ class: 'bg-neutral-900' }, hint(text))
