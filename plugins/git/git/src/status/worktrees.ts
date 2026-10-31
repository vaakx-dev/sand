import { gitMaybe } from '../run/run'
import { normalize } from 'node:path'

export interface Worktree {
  path: string
  branch?: string
  bare: boolean
}

const parseBlock = (block: string): Worktree | undefined => {
  const tree: Worktree = { path: '', bare: false }
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) tree.path = normalize(line.slice('worktree '.length))
    else if (line.startsWith('branch refs/heads/')) tree.branch = line.slice('branch refs/heads/'.length)
    else if (line === 'bare') tree.bare = true
  }
  return tree.path ? tree : undefined
}

export const readWorktrees = async (cwd: string): Promise<Worktree[]> => {
  const out = await gitMaybe(cwd, ['worktree', 'list', '--porcelain'], { read: true }).catch(() => undefined)
  if (!out) return []
  return out.split(/\r?\n\r?\n/).flatMap(block => parseBlock(block) ?? [])
}
