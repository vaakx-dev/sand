import type { GitRunner } from '@sand/git/contract'
import type { Repo } from './repo'

const read = async (git: GitRunner, repo: Repo, args: string[]) => (await git.maybe(repo.root, args, { read: true })) || undefined

export const currentBranch = (git: GitRunner, repo: Repo) => read(git, repo, ['symbolic-ref', '-q', '--short', 'HEAD'])

export const headCommit = (git: GitRunner, repo: Repo) => read(git, repo, ['rev-parse', '-q', '--verify', 'HEAD'])

export const refExists = async (git: GitRunner, repo: Repo, ref: string) => !!(await read(git, repo, ['rev-parse', '-q', '--verify', ref]))

export const upstreamOf = (git: GitRunner, repo: Repo) => read(git, repo, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])

export const readConfig = (git: GitRunner, repo: Repo, key: string) => read(git, repo, ['config', '--get', key])

export const listRemotes = async (git: GitRunner, repo: Repo) => (await read(git, repo, ['remote']))?.split(/\r?\n/).filter(Boolean) ?? []

export const countCommits = async (git: GitRunner, repo: Repo, range: string[]) => Number(await read(git, repo, ['rev-list', '--count', ...range])) || 0
