import type { GitRunner } from '@sand/git/contract'

export const longGitMs = 2 * 60_000

const read = { read: true }

export const gitTrue = async (git: GitRunner, dir: string, args: string[]) => (await git.run(dir, args, read)).code === 0

export const hasCommit = (git: GitRunner, dir: string, sha: string) => gitTrue(git, dir, ['cat-file', '-e', `${sha}^{commit}`])

export const hasBranch = (git: GitRunner, dir: string, name: string) => gitTrue(git, dir, ['show-ref', '--verify', '--quiet', `refs/heads/${name}`])

export const isAncestor = (git: GitRunner, dir: string, older: string, newer: string) => gitTrue(git, dir, ['merge-base', '--is-ancestor', older, newer])
