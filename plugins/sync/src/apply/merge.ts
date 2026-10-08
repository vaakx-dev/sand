import { hiddenGit, hiddenLine, hiddenOut, type Hidden } from '../folder/hidden'
import { commitTree } from '../snapshot/tree'

const labels = { ours: 'this-pc', theirs: 'other-pc' }

const emptyBase = async (hidden: Hidden) => {
  const empty = await hiddenLine(hidden, ['hash-object', '-t', 'tree', '--stdin'], { input: '' })
  return commitTree(hidden, empty, [], 'sand sync base')
}

const baseOf = async (hidden: Hidden, ours: string, theirs: string) => {
  const found = await hiddenGit(hidden, ['merge-base', ours, theirs])
  return found.code === 0 && found.out.trim() ? found.out.trim() : emptyBase(hidden)
}

export const isAncestor = async (hidden: Hidden, ancestor: string, descendant: string) =>
  (await hiddenGit(hidden, ['merge-base', '--is-ancestor', ancestor, descendant])).code === 0

export const threeWay = async (hidden: Hidden, ours: string, theirs: string) => {
  const base = await baseOf(hidden, ours, theirs)
  await hiddenOut(hidden, ['update-ref', `refs/heads/${labels.ours}`, ours])
  await hiddenOut(hidden, ['update-ref', `refs/heads/${labels.theirs}`, theirs])
  try {
    const merged = await hiddenGit(hidden, ['merge-tree', '--write-tree', '--name-only', '--no-messages', '-z', `--merge-base=${base}`, labels.ours, labels.theirs])
    if (merged.code > 1) throw new Error(merged.err.trim() || 'git merge-tree failed')
    const [tree = '', ...files] = merged.out.split('\0')
    return { tree, conflicts: [...new Set(files.filter(Boolean))] }
  } finally {
    await hiddenGit(hidden, ['update-ref', '-d', `refs/heads/${labels.ours}`])
    await hiddenGit(hidden, ['update-ref', '-d', `refs/heads/${labels.theirs}`])
  }
}
