import type { DiffFile, DiffList } from '@sand/git-diff/contract'
import { comparePaths } from '@sand/util'

export type ListState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; list: DiffList } | { kind: 'error'; message: string }

export const idleList: ListState = { kind: 'idle' }

export const loadingList: ListState = { kind: 'loading' }

const byPath = (a: DiffFile, b: DiffFile) => comparePaths(a.path, b.path)

export const sortedFiles = (state: ListState) => (state.kind === 'ready' ? [...state.list.files].sort(byPath) : [])

export const uncounted = ({ files, total, truncated }: DiffList) => Boolean(truncated) && total <= files.length
