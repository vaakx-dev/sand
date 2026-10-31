import type { FileMarks, FileMarksSource } from '@sand/files-panel/contract'
import { type GitStatus, type GitStatusClient, repoOf } from '@sand/git/contract'

const basePath = (prefix: string) => {
  const trimmed = prefix.replace(/\/+$/, '')
  return trimmed && trimmed !== '.' ? `${trimmed}/` : ''
}

const marksOf = (status: GitStatus | undefined): FileMarks | undefined => {
  const local = repoOf(status)
  if (!local) return undefined
  const base = basePath(local.prefix)
  return new Map(local.files.filter(file => file.path.startsWith(base)).map(file => [file.path.slice(base.length), file.kind]))
}

export const gitFileMarks = (client: GitStatusClient): FileMarksSource => ({
  follow: (folder, onChange) => client.follow(folder, status => onChange(marksOf(status))),
})
