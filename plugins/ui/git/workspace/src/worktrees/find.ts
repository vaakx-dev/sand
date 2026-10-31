import type { Worktree } from '@sand/worktrees/contract'
import { isInside } from '../paths'

export const worktreeAt = (list: Worktree[], cwd: string) =>
  list.filter(tree => !tree.removed && isInside(cwd, tree.path)).sort((a, b) => b.path.length - a.path.length)[0]
