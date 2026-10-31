import type { GitRunner } from '@sand/git/contract'
import { readOut } from '../git'

export const maxUntracked = 3000

export const literalPaths = { GIT_LITERAL_PATHSPECS: '1' }

export interface Untracked {
  paths: string[]
  truncated: boolean
}

export const listUntracked = async (git: GitRunner, root: string, paths: string[]): Promise<Untracked> => {
  const out = await readOut(git, root, ['ls-files', '--others', '--exclude-standard', '-z', '--', ...paths], { env: literalPaths })
  const found = out.split('\0').filter(path => path && !path.endsWith('/'))
  return { paths: found.slice(0, maxUntracked), truncated: found.length > maxUntracked }
}
