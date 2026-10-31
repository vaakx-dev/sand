import type { GitRepoLocal } from '@sand/git/contract'
import { plural } from '@sand/util'
import type { Worktree } from '@sand/worktrees/contract'
import { div } from '@vaakx-dev/vrui'
import { folderName, samePath } from '../paths'
import { menuText } from '../menu-text'
import type { WorkspaceChoice } from './choice'
import type { ChipMenu } from './menu'

export const otherWorktrees = (list: Worktree[] | undefined, local: GitRepoLocal | undefined) =>
  (list ?? []).filter(tree => !tree.removed && !samePath(tree.path, tree.main) && !samePath(tree.path, local?.root))

export const worktreeName = (tree: Worktree) => tree.branch ?? folderName(tree.path)

export const existingSummary = (trees: Worktree[]) => {
  const names = trees.slice(0, 2).map(worktreeName).join(', ')
  return `${plural(trees.length, 'worktree')}: ${names}${trees.length > 2 ? '…' : ''}`
}

const threadsLine = (tree: Worktree) => (tree.sessions.length ? plural(tree.sessions.length, 'thread') : 'No threads')

const isPicked = (choice: WorkspaceChoice, tree: Worktree) => choice.kind === 'existing' && samePath(choice.path, tree.path)

export const existingList = (menu: ChipMenu, trees: Worktree[], back: () => void) => {
  const { kit, model, pick } = menu
  const row = (tree: Worktree) =>
    kit.choiceItem(
      {
        selected: () => isPicked(model.current.get(), tree),
        icon: 'worktree',
        onClick: () => pick({ kind: 'existing', path: tree.path, branch: tree.branch }),
      },
      menuText(kit, { title: worktreeName(tree), detail: threadsLine(tree) }),
    )
  return div({ class: 'flex flex-col' }, kit.menuItem({ icon: 'back', onClick: back }, 'Existing worktree'), kit.menuSeparator(), ...trees.map(row))
}
