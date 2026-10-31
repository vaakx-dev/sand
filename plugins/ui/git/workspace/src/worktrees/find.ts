import { isInside, samePath } from '@sand/util'
import type { Worktree } from '@sand/worktrees/contract'

export const inFolder = (path: string, folder: string) => samePath(path, folder) || isInside(path, folder)

export const worktreeAt = (list: Worktree[], cwd: string) =>
  list.filter(tree => !tree.removed && inFolder(cwd, tree.path)).sort((a, b) => b.path.length - a.path.length)[0]
