import { samePath } from '@sand/kit/fs'
import { gitMaybe, gitOk } from '@sand/kit/git'
import { basename, join, relative, resolve } from 'node:path'

interface Checkout {
  path: string
  head: string
  branch: string | null
}

export interface Repo {
  root: string
  main: string
  name: string
  branch: string | null
  linked: boolean
  checkouts: Checkout[]
}

const parseCheckout = (block: string): Checkout[] => {
  const lines = block.split('\n').map(line => line.trim())
  const value = (key: string) => lines.find(line => line.startsWith(`${key} `))?.slice(key.length + 1)
  const path = value('worktree')
  if (!path || lines.includes('bare')) return []
  const ref = value('branch')
  return [{ path: resolve(path), head: value('HEAD') ?? '', branch: ref ? ref.replace(/^refs\/heads\//, '') : null }]
}

export const repoOf = async (cwd: string): Promise<Repo | undefined> => {
  const top = await gitMaybe(cwd, ['rev-parse', '--show-toplevel'])
  if (!top) return undefined
  const root = resolve(top)
  const checkouts = (await gitOk(root, ['worktree', 'list', '--porcelain'])).split(/\n\s*\n/).flatMap(parseCheckout)
  const main = checkouts[0]?.path ?? root
  const branch = (await gitMaybe(root, ['symbolic-ref', '--short', '-q', 'HEAD'])) || null
  return { root, main, name: basename(main), branch, linked: !samePath(root, main), checkouts }
}

export const within = (root: string, cwd: string, target: string) => {
  const rest = relative(root, cwd)
  return rest && !rest.startsWith('..') ? join(target, rest) : target
}

export const changedCount = async (path: string) => (await gitMaybe(path, ['status', '--porcelain']))?.split('\n').filter(Boolean).length ?? 0

export const unpushedCount = async (path: string) => Number(await gitMaybe(path, ['rev-list', '--count', 'HEAD', '--not', '--remotes'])) || 0

export const localBranches = async (path: string) =>
  ((await gitMaybe(path, ['for-each-ref', '--sort=-committerdate', '--format=%(refname:short)', 'refs/heads'])) ?? '')
    .split('\n')
    .filter(Boolean)
    .slice(0, 50)

const refExists = async (path: string, ref: string) => (await gitMaybe(path, ['show-ref', '--verify', '--quiet', ref])) !== undefined

export const branchExists = (path: string, branch: string) => refExists(path, `refs/heads/${branch}`)

export const isRemoteBranch = (path: string, ref: string) => refExists(path, `refs/remotes/${ref}`)

export const latestOf = async (path: string, branch: string) => {
  const ref = await gitMaybe(path, ['rev-parse', '--abbrev-ref', `${branch}@{upstream}`])
  if (!ref) return undefined
  const behind = Number(await gitMaybe(path, ['rev-list', '--count', `${branch}..${ref}`])) || 0
  return { ref, behind }
}

export const headOf = (path: string) => gitOk(path, ['rev-parse', 'HEAD'])
