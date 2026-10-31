import type { GitOptions, GitRepo, GitRunner } from '@sand/git/contract'

export interface DiffGit {
  git: GitRunner
  repos: GitRepo
}

export const readOut = async (git: GitRunner, cwd: string, args: string[], options: GitOptions = {}) => {
  const result = await git.run(cwd, args, { ...options, read: true })
  if (result.code !== 0) throw new Error(git.classify(result, args).message)
  return result.out
}

export const isRevision = (name: string) => !!name && !name.startsWith('-')

export const commitOf = (git: GitRunner, root: string, revision: string) =>
  isRevision(revision) ? git.maybe(root, ['rev-parse', '--verify', '-q', `${revision}^{commit}`], { read: true }) : Promise.resolve(undefined)

export const treeOf = (git: GitRunner, root: string, revision: string) =>
  isRevision(revision) ? git.maybe(root, ['rev-parse', '--verify', '-q', `${revision}^{tree}`], { read: true }) : Promise.resolve(undefined)

export const emptyTree = (git: GitRunner, root: string) => git.ok(root, ['hash-object', '-t', 'tree', '--stdin'], { input: '', read: true })
