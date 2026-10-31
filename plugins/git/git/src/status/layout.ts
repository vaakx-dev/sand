import type { GitLayout } from '../contract'
import { gitMaybe } from '../run/run'
import { existsSync } from 'node:fs'
import { normalize } from 'node:path'
import { readWorktrees } from './worktrees'

const revParse = ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir', '--show-prefix']

const mainCheckout = async (root: string) => (await readWorktrees(root)).find(tree => !tree.bare)?.path ?? root

export const readLayout = async (cwd: string): Promise<GitLayout | undefined> => {
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
