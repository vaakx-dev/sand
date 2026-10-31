import type { GitRunner } from '@sand/git/contract'

const mostCommits = 50
const commitChars = 12_000
const patchLines = 4000
const patchChars = 40_000

export interface BranchChanges {
  commits: string
  stat: string
  patch: string
  truncated: boolean
}

const diffArgs = ['diff', '--no-color', '--no-ext-diff', '--find-renames']

export const readChanges = async (git: GitRunner, root: string, base: string): Promise<BranchChanges> => {
  const range = `${base}...HEAD`
  const [log, stat, patch] = await Promise.all([
    git.ok(root, ['log', '--no-merges', `-${mostCommits}`, '--format=- %s%n%w(0,2,2)%b', `${base}..HEAD`], { read: true }),
    git.ok(root, [...diffArgs, '--stat', range], { read: true }),
    git.lines(root, [...diffArgs, range], patchLines, { read: true }),
  ])
  const text = patch.lines.join('\n')
  return {
    commits: log.slice(0, commitChars),
    stat,
    patch: text.slice(0, patchChars),
    truncated: patch.lines.length >= patchLines || text.length > patchChars || log.length > commitChars,
  }
}
