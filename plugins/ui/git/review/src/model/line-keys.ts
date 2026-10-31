import type { DiffLine } from '@sand/git-diff-view/contract'
import type { PendingComment } from '@sand/pull-review/contract'

export const lineKeys = (line: DiffLine) => [
  ...(line.kind !== 'del' && line.new !== undefined ? [`RIGHT:${line.new}`] : []),
  ...(line.kind !== 'add' && line.old !== undefined ? [`LEFT:${line.old}`] : []),
]

export const commentKey = ({ side, line }: PendingComment) => `${side}:${line}`
