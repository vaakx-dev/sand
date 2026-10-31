import type { GitLayout, GitRunner } from '@sand/git/contract'
import type { GitActionResult } from '../contract'
import { failure } from '../run/failure'
import { coversAll, readChanges, withRenameSources } from './changes'
import { noFilesPicked } from './empty'

const midCommitHeads = ['MERGE_HEAD', 'CHERRY_PICK_HEAD']

const midCommit = async (git: GitRunner, repo: GitLayout) => {
  const found = await Promise.all(midCommitHeads.map(head => git.maybe(repo.root, ['rev-parse', '-q', '--verify', head], { read: true })))
  return found.some(Boolean)
}

export const selectPaths = async (git: GitRunner, repo: GitLayout, paths?: string[]): Promise<GitActionResult<{ paths?: string[] }>> => {
  if (!paths) return { ok: true }
  if (!paths.length) return noFilesPicked()
  const changes = await readChanges(git, repo)
  const picked = withRenameSources(paths, changes)
  if (!(await midCommit(git, repo))) return { ok: true, paths: picked }
  if (coversAll(picked, changes)) return { ok: true }
  return failure('conflict', 'A merge is in progress, so every change has to be committed together. Select all the files.')
}
