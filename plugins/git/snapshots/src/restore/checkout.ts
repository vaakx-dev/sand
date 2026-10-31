import type { GitRunner } from '@sand/git/contract'
import { removeLeftovers } from './leftovers'

export const checkoutSnapshot = async (git: GitRunner, root: string, snapshot: string, saved: string) => {
  await git.ok(root, ['read-tree', '-u', '--reset', `${snapshot}^{tree}`])
  await removeLeftovers(git, root, saved)
  await git.ok(root, ['read-tree', '--reset', `${snapshot}^1^{tree}`])
  await git.run(root, ['update-index', '-q', '--refresh'])
}
