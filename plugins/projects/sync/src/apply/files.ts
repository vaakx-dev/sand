import { rm, rmdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { hiddenOut, type Hidden } from '../folder/hidden'
import { inside } from '../folder/paths'

const pruneEmpty = async (folder: string, start: string) => {
  let dir = dirname(start)
  while (dir !== folder && dir.startsWith(folder)) {
    if (!(await rmdir(dir).then(() => true, () => false))) return
    dir = dirname(dir)
  }
}

export const removeFiles = async (hidden: Hidden, paths: string[]) => {
  for (const path of paths) {
    const target = inside(hidden.folder, path)
    if (!target) continue
    await rm(target, { force: true })
    await pruneEmpty(hidden.folder, target)
  }
}

export const checkoutPaths = async (hidden: Hidden, tree: string, paths: string[]) => {
  if (paths.length === 0) return
  const index = join(hidden.dir, `checkout-${Bun.randomUUIDv7()}.index`)
  const env = { GIT_INDEX_FILE: index }
  try {
    await hiddenOut(hidden, ['read-tree', tree], { env })
    await hiddenOut(hidden, ['checkout-index', '-f', '-z', '--stdin'], { env, input: `${paths.join('\0')}\0` })
  } finally {
    await rm(index, { force: true })
  }
}

export const writeDiff = async (hidden: Hidden, fromTree: string, toTree: string) => {
  const listing = await hiddenOut(hidden, ['diff-tree', '-r', '-z', '--name-status', '--no-renames', fromTree, toTree])
  const items = listing.split('\0')
  const paths = items.filter((_, index) => index % 2 === 1)
  const deleted = (index: number) => items[index * 2] === 'D'
  const removed = paths.filter((_, index) => deleted(index))
  const written = paths.filter((_, index) => !deleted(index))
  await removeFiles(hidden, removed)
  await checkoutPaths(hidden, toTree, written)
  return removed.length + written.length
}
