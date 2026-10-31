import type { GitWorktree } from '../contract'
import { gitOk } from '../run/run'
import { normalize } from 'node:path'

const parseBlock = (block: string): GitWorktree | undefined => {
  const tree: GitWorktree = { path: '', bare: false }
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) tree.path = normalize(line.slice('worktree '.length))
    else if (line.startsWith('HEAD ')) tree.head = line.slice('HEAD '.length)
    else if (line.startsWith('branch refs/heads/')) tree.branch = line.slice('branch refs/heads/'.length)
    else if (line === 'bare') tree.bare = true
  }
  return tree.path ? tree : undefined
}

export const readWorktrees = async (cwd: string): Promise<GitWorktree[]> => {
  const out = await gitOk(cwd, ['worktree', 'list', '--porcelain'], { read: true, what: "Couldn't list worktrees" })
  return out ? out.split(/\r?\n\r?\n/).flatMap(block => parseBlock(block) ?? []) : []
}
