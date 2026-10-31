import type { DiffFile, DiffList } from '@sand/git-diff/contract'

export type ListState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; list: DiffList } | { kind: 'error'; message: string }

export const idleList: ListState = { kind: 'idle' }

export const loadingList: ListState = { kind: 'loading' }

const byPath = (a: DiffFile, b: DiffFile) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)

export const sortedFiles = (state: ListState) => (state.kind === 'ready' ? [...state.list.files].sort(byPath) : [])

export const uncounted = ({ files, total, truncated }: DiffList) => Boolean(truncated) && total <= files.length

export const badgeOf = (state: ListState) => {
  if (state.kind !== 'ready') return undefined
  const { total } = state.list
  if (!total) return undefined
  return uncounted(state.list) ? `${total}+` : total
}
