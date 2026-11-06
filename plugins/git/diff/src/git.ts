import type { GitRepo } from '@sand/git/contract'
import type { GitRunner } from '@sand/git-runner/contract'

export interface DiffGit {
  git: GitRunner
  repos: GitRepo
}

export const isRevision = (name: string) => !!name && !name.startsWith('-')

export const commitOf = (git: GitRunner, root: string, revision: string) =>
  isRevision(revision) ? git.maybe(root, ['rev-parse', '--verify', '-q', `${revision}^{commit}`], { read: true }) : Promise.resolve(undefined)

export const treeOf = (git: GitRunner, root: string, revision: string) =>
  isRevision(revision) ? git.maybe(root, ['rev-parse', '--verify', '-q', `${revision}^{tree}`], { read: true }) : Promise.resolve(undefined)

export const emptyTree = (git: GitRunner, root: string) => git.ok(root, ['hash-object', '-t', 'tree', '--stdin'], { input: '', read: true })
