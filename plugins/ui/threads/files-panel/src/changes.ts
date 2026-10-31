import type { FileKind, GitStatus } from '@sand/git/contract'
import { foldersOf } from './tree/build'

export interface Changes {
  files: Record<string, FileKind>
  folders: Set<string>
}

export const noChanges: Changes = { files: {}, folders: new Set() }

const treeKinds = new Set<FileKind>(['added', 'deleted', 'untracked', 'renamed'])

const basePath = (prefix: string) => {
  const trimmed = prefix.replace(/\/+$/, '')
  return trimmed && trimmed !== '.' ? `${trimmed}/` : ''
}

export const changesOf = (status: GitStatus | undefined): Changes => {
  const local = status?.local
  if (!local?.repo) return noChanges
  const base = basePath(local.prefix)
  const files: Record<string, FileKind> = {}
  for (const file of local.files) if (file.path.startsWith(base)) files[file.path.slice(base.length)] = file.kind
  return { files, folders: foldersOf(Object.keys(files)) }
}

export const sameChanges = (a: Changes, b: Changes) => JSON.stringify(a.files) === JSON.stringify(b.files)

export const shapeOf = (changes: Changes) =>
  Object.entries(changes.files)
    .filter(([, kind]) => treeKinds.has(kind))
    .map(([path]) => path)
    .sort()
    .join('\n')
