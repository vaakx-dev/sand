import type { GitRunner } from '@sand/git/contract'

const read = { read: true }
const mostTries = 100

export const refExists = async (git: GitRunner, dir: string, ref: string) =>
  Boolean(await git.maybe(dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], read))

export const branchExists = (git: GitRunner, dir: string, name: string) => refExists(git, dir, `refs/heads/${name}`)

export const headCommit = (git: GitRunner, dir: string) => git.maybe(dir, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], read)

export const currentBranch = async (git: GitRunner, dir: string) =>
  (await git.maybe(dir, ['symbolic-ref', '--quiet', '--short', 'HEAD'], read)) || undefined

export const hasUpstream = async (git: GitRunner, dir: string, branch: string) =>
  Boolean(await git.maybe(dir, ['rev-parse', '--abbrev-ref', '--verify', '--quiet', `${branch}@{upstream}`], read))

export const validBranch = async (git: GitRunner, dir: string, name: string) => Boolean(await git.maybe(dir, ['check-ref-format', '--branch', name], read))

export const uniqueBranch = async (git: GitRunner, dir: string, name: string) => {
  for (let count = 1; count <= mostTries; count++) {
    const candidate = count === 1 ? name : `${name}-${count}`
    if (!(await branchExists(git, dir, candidate))) return candidate
  }
  throw new Error(`Every branch name from ${name} to ${name}-${mostTries} is taken`)
}

export const checkedNewBranch = async (git: GitRunner, dir: string, name: string) => {
  const branch = name.trim()
  if (!branch || !(await validBranch(git, dir, branch))) throw new Error(`"${name}" isn't a valid branch name.`)
  if (await branchExists(git, dir, branch)) throw new Error(`A branch called ${branch} already exists.`)
  return branch
}
