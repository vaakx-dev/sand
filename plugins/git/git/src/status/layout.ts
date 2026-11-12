import type { GitLayout } from '../contract'
import { pathKey } from '../contract/paths'
import { gitMaybe } from '@sand/git-runner/contract'
import { existsSync } from 'node:fs'
import { dirname, join, normalize, resolve } from 'node:path'
import { readWorktrees } from './worktrees'

const revParse = ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir', '--show-prefix']

const mainCheckout = async (root: string) => (await readWorktrees(root)).find(tree => !tree.bare)?.path ?? root

const readLayout = async (cwd: string): Promise<GitLayout | undefined> => {
  if (!cwd || !existsSync(cwd)) return undefined
  const out = await gitMaybe(cwd, revParse, { read: true })
  if (!out) return undefined
  const [top, git, common, prefix = ''] = out.split(/\r?\n/)
  if (!top || !git || !common) return undefined
  const root = normalize(top)
  const gitDir = normalize(git)
  const commonDir = normalize(common)
  const worktree = gitDir !== commonDir
  return { root, prefix, gitDir, commonDir, worktree, main: worktree ? await mainCheckout(root) : root }
}

const checkoutAround = (cwd: string) => {
  for (let dir = resolve(cwd); ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir
    if (dirname(dir) === dir) return undefined
  }
}

const stillHolds = (cwd: string, layout: GitLayout) => {
  if (!existsSync(cwd) || !existsSync(layout.gitDir)) return false
  const checkout = checkoutAround(cwd)
  return checkout !== undefined && pathKey(checkout) === pathKey(layout.root)
}

const createLayouts = () => {
  const known = new Map<string, Promise<GitLayout | undefined>>()

  const fresh = (cwd: string) => {
    const reading = readLayout(cwd).then(layout => {
      if (!layout && known.get(cwd) === reading) known.delete(cwd)
      return layout
    })
    known.set(cwd, reading)
    return reading
  }

  const read = async (cwd: string) => {
    const layout = await (known.get(cwd) ?? fresh(cwd))
    return !layout || stillHolds(cwd, layout) ? layout : fresh(cwd)
  }

  return { read, clear: () => known.clear() }
}

type Layouts = ReturnType<typeof createLayouts>

export { createLayouts, type Layouts }
