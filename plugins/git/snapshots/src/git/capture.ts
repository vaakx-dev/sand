import type { GitRunner } from '@sand/git/contract'
import type { SnapshotRepo } from './repo'
import { type IndexEnv, withTempIndex } from './temp-index'

const identity = {
  GIT_AUTHOR_NAME: 'sand',
  GIT_AUTHOR_EMAIL: 'sand@localhost',
  GIT_COMMITTER_NAME: 'sand',
  GIT_COMMITTER_EMAIL: 'sand@localhost',
}

const plainIndex = ['-c', 'core.splitIndex=false']

const commitTree = (git: GitRunner, root: string, tree: string, parent: string | undefined, message: string) =>
  git.ok(root, ['commit-tree', '--no-gpg-sign', tree, ...(parent ? ['-p', parent] : []), '-m', message], { env: identity })

const addEverything = async (git: GitRunner, root: string, env: IndexEnv, ignored: string[]) => {
  await git.ok(root, [...plainIndex, 'add', '-A'], { env })
  if (!ignored.length) return
  await git.ok(root, [...plainIndex, 'add', '-f', '--pathspec-from-file=-', '--pathspec-file-nul'], { env, input: ignored.join('\0') })
}

export const captureSnapshot = async (git: GitRunner, repo: SnapshotRepo, message: string, ignored: string[] = []) => {
  const head = await git.maybe(repo.root, ['rev-parse', '--verify', '-q', 'HEAD^{commit}'], { read: true })
  return withTempIndex(repo, async env => {
    const staged = await git.maybe(repo.root, [...plainIndex, 'write-tree'], { env })
    await addEverything(git, repo.root, env, ignored)
    const files = await git.ok(repo.root, [...plainIndex, 'write-tree'], { env })
    const index = await commitTree(git, repo.root, staged ?? files, head, `${message} (index)`)
    return commitTree(git, repo.root, files, index, message)
  })
}
