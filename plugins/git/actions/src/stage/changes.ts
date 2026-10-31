import type { GitLayout, GitRunner } from '@sand/git/contract'

export interface Change {
  path: string
  from?: string
}

const statusArgs = ['status', '--porcelain=v2', '-z', '--untracked-files=all', '--find-renames']

const fieldsBeforePath: Record<string, number> = { '1': 8, '2': 9, u: 10, '?': 1 }

const pathAfter = (record: string, spaces: number) => {
  let at = 0
  for (let count = 0; count < spaces; count++) at = record.indexOf(' ', at) + 1
  return record.slice(at)
}

const parseChanges = (out: string) => {
  const records = out.split('\0')
  const changes: Change[] = []
  for (let index = 0; index < records.length; index++) {
    const record = records[index] ?? ''
    const spaces = fieldsBeforePath[record[0] ?? '']
    if (spaces === undefined) continue
    const path = pathAfter(record, spaces)
    changes.push(record[0] === '2' ? { path, from: records[++index] ?? '' } : { path })
  }
  return changes
}

export const readChanges = async (git: GitRunner, repo: GitLayout) => parseChanges(await git.ok(repo.root, statusArgs, { read: true }))

export const withRenameSources = (paths: string[], changes: Change[]) => {
  const picked = new Set(paths)
  for (const change of changes) if (change.from && picked.has(change.path)) picked.add(change.from)
  return [...picked]
}

export const coversAll = (paths: string[], changes: Change[]) => {
  const picked = new Set(paths)
  return changes.every(change => picked.has(change.path) && (!change.from || picked.has(change.from)))
}
