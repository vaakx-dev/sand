import type { GitLayout, GitRunner } from '@sand/git/contract'

const read = async (git: GitRunner, repo: GitLayout, args: string[]) => (await git.maybe(repo.root, args, { read: true })) || undefined

export const currentBranch = (git: GitRunner, repo: GitLayout) => read(git, repo, ['symbolic-ref', '-q', '--short', 'HEAD'])

export const headCommit = (git: GitRunner, repo: GitLayout) => read(git, repo, ['rev-parse', '-q', '--verify', 'HEAD'])

export const refExists = async (git: GitRunner, repo: GitLayout, ref: string) => !!(await read(git, repo, ['rev-parse', '-q', '--verify', ref]))

export const upstreamOf = (git: GitRunner, repo: GitLayout) => read(git, repo, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])

export const readConfig = (git: GitRunner, repo: GitLayout, key: string) => read(git, repo, ['config', '--get', key])

export const listRemotes = async (git: GitRunner, repo: GitLayout) => (await read(git, repo, ['remote']))?.split(/\r?\n/).filter(Boolean) ?? []

export const countCommits = async (git: GitRunner, repo: GitLayout, range: string[]) => Number(await read(git, repo, ['rev-list', '--count', ...range])) || 0
