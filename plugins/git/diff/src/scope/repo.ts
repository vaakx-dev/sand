import type { GitRunner } from '@sand/git/contract'
import { normalize } from 'node:path'
import { commitOf } from '../git'

export interface Repo {
  root: string
  index: string
  head?: string
  branch?: string
}

const layout = ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-path', 'index']

export const readRepo = async (git: GitRunner, cwd: string): Promise<Repo> => {
  const [top, index] = (await git.ok(cwd, layout, { read: true })).split(/\r?\n/)
  if (!top || !index) throw new Error("This folder isn't a git repository.")
  const root = normalize(top)
  const [head, branch] = await Promise.all([
    commitOf(git, root, 'HEAD'),
    git.maybe(root, ['symbolic-ref', '-q', '--short', 'HEAD'], { read: true }),
  ])
  return { root, index: normalize(index), head, branch: branch || undefined }
}
