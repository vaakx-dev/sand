import { samePath } from '@sand/kit/fs'
import { basename, join, relative, resolve } from 'node:path'
import { gitMaybe, gitOk } from './run'

export interface Checkout {
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

const parseList = (out: string): Checkout[] =>
  out
    .split(/\n\s*\n/)
    .map(block => {
      const lines = block.split('\n').map(line => line.trim())
      const value = (key: string) => lines.find(line => line.startsWith(`${key} `))?.slice(key.length + 1)
      const ref = value('branch')
      return { path: resolve(value('worktree') ?? ''), head: value('HEAD') ?? '', branch: ref ? ref.replace(/^refs\/heads\//, '') : null, bare: lines.includes('bare') }
    })
    .filter(entry => entry.path && !entry.bare)
    .map(({ bare, ...entry }) => entry)

export const checkouts = async (cwd: string) => parseList(await gitOk(cwd, ['worktree', 'list', '--porcelain']))

export const repoOf = async (cwd: string): Promise<Repo | undefined> => {
  const top = await gitMaybe(cwd, ['rev-parse', '--show-toplevel'])
  if (!top) return undefined
  const root = resolve(top)
  const list = await checkouts(root)
  const main = list[0]?.path ?? root
  const branch = (await gitMaybe(root, ['symbolic-ref', '--short', '-q', 'HEAD'])) || null
  return { root, main, name: basename(main), branch, linked: !samePath(root, main), checkouts: list }
}

export const within = (root: string, cwd: string, target: string) => {
  const rest = relative(root, cwd)
  return rest && !rest.startsWith('..') ? join(target, rest) : target
}

export const changedCount = async (path: string) => {
  const out = await gitMaybe(path, ['status', '--porcelain'])
  return out === undefined ? 0 : out.split('\n').filter(Boolean).length
}

export const unpushedCount = async (path: string) => {
  const out = await gitMaybe(path, ['rev-list', '--count', 'HEAD', '--not', '--remotes'])
  return out === undefined ? 0 : Number(out) || 0
}

export const localBranches = async (path: string) =>
  ((await gitMaybe(path, ['for-each-ref', '--sort=-committerdate', '--format=%(refname:short)', 'refs/heads'])) ?? '')
    .split('\n')
    .filter(Boolean)
    .slice(0, 50)

export const branchExists = async (path: string, branch: string) => (await gitMaybe(path, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`])) !== undefined

export const headOf = (path: string) => gitOk(path, ['rev-parse', 'HEAD'])
