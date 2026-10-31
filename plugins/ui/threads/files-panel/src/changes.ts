import type { FileChangeKind } from '@sand/ui-kit/contract'
import type { FileMarks } from './contract'
import { foldersOf } from './tree/build'

export interface Changes {
  files: FileMarks
  folders: Set<string>
}

export const noChanges: Changes = { files: new Map(), folders: new Set() }

const shapeKinds = new Set<FileChangeKind>(['added', 'deleted', 'untracked', 'renamed'])

export const changesOf = (marks: FileMarks | undefined): Changes => (marks ? { files: marks, folders: foldersOf([...marks.keys()]) } : noChanges)

const printOf = (marks: FileMarks) => JSON.stringify([...marks].sort(([a], [b]) => a.localeCompare(b)))

export const sameChanges = (a: Changes, b: Changes) => printOf(a.files) === printOf(b.files)

export const shapeOf = (changes: Changes) =>
  [...changes.files]
    .filter(([, kind]) => shapeKinds.has(kind))
    .map(([path]) => path)
    .sort()
    .join('\n')
