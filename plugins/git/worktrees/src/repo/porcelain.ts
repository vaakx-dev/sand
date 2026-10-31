import { normalize } from 'node:path'

export interface ListedWorktree {
  path: string
  head?: string
  branch?: string
  bare: boolean
}

const parseBlock = (block: string): ListedWorktree | undefined => {
  const tree: ListedWorktree = { path: '', bare: false }
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) tree.path = normalize(line.slice('worktree '.length))
    else if (line.startsWith('HEAD ')) tree.head = line.slice('HEAD '.length)
    else if (line.startsWith('branch refs/heads/')) tree.branch = line.slice('branch refs/heads/'.length)
    else if (line === 'bare') tree.bare = true
  }
  return tree.path ? tree : undefined
}

export const parseWorktrees = (out: string) => out.split(/\r?\n\r?\n/).flatMap(block => parseBlock(block) ?? [])
