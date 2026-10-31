import type { GitRunner } from '@sand/git/contract'
import { existsSync } from 'node:fs'
import { normalize } from 'node:path'

export interface Repo {
  root: string
  gitDir: string
  commonDir: string
}

const revParse = ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-dir', '--git-common-dir']

export const readRepo = async (git: GitRunner, cwd: string): Promise<Repo | undefined> => {
  if (!cwd || !existsSync(cwd)) return undefined
  const out = await git.maybe(cwd, revParse, { read: true })
  const [root, gitDir, commonDir] = out?.split(/\r?\n/) ?? []
  if (!root || !gitDir || !commonDir) return undefined
  return { root: normalize(root), gitDir: normalize(gitDir), commonDir: normalize(commonDir) }
}
