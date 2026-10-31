import { type GitPlace, repoOf } from '@sand/git/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { projects } from '@sand/web-client/contract'
import { div, dynamicChild, show, sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { menuText } from '../menu-text'
import type { WorktreeCache } from '../worktrees/cache'
import { checkoutLabel, defaultBranch, kindOf, type WorkspaceChoice } from './choice'
import type { WorkspaceDefaults } from './defaults'
import { existingList, existingSummary, otherWorktrees } from './existing'
import type { DraftModel } from './model'

export interface ChipMenu {
  ctx: WorkspaceContext
  kit: Kit
  model: DraftModel
  cache: WorktreeCache
  defaults: WorkspaceDefaults
  pick(choice: WorkspaceChoice): void
  openBranches(): void
  makeDefault(): void
}

const isNewFromDefault = (choice: WorkspaceChoice) => choice.kind === 'new' && !choice.from

const defaultRow = (menu: ChipMenu, place: GitPlace) => {
  const { ctx, kit, model, defaults } = menu
  const project = ctx.get(projects)?.name(place.cwd, place.device) || 'this project'
  const differs = () => kindOf(model.current.get()) !== (defaults.get(place) ?? 'checkout')
  const where = () => (kindOf(model.current.get()) === 'worktree' ? 'a new worktree' : 'the main checkout')
  return show(differs, () =>
    div(
      { class: 'flex flex-col' },
      kit.menuSeparator(),
      kit.menuItem({ icon: 'star', title: () => `New threads in ${project} start in ${where()}`, onClick: menu.makeDefault }, ...menuText(kit, { title: 'Make this the default' })),
    ),
  )
}

const mainList = (menu: ChipMenu, place: GitPlace, showExisting: () => void) => {
  const { kit, model, cache, pick, openBranches } = menu
  const local = repoOf(model.status.get())
  const trees = otherWorktrees(cache.get(place), local)
  const current = () => model.current.get()
  const from = () => {
    const choice = current()
    return choice.kind === 'new' ? choice.from : undefined
  }
  return div(
    { class: 'flex flex-col' },
    kit.choiceItem(
      { selected: () => current().kind === 'checkout', icon: 'branch', onClick: () => pick({ kind: 'checkout' }) },
      ...menuText(kit, { title: checkoutLabel(local), detail: local?.branch }),
    ),
    kit.choiceItem(
      { selected: () => isNewFromDefault(current()), icon: 'worktree', title: 'Its own folder and branch, named from your first message', onClick: () => pick({ kind: 'new' }) },
      ...menuText(kit, { title: 'New worktree', detail: `from ${defaultBranch(local)}` }),
    ),
    trees.length
      ? kit.choiceItem(
          { selected: () => current().kind === 'existing', icon: 'worktree', title: existingSummary(trees), onClick: showExisting },
          ...menuText(kit, { title: 'Existing worktree…', detail: String(trees.length) }),
        )
      : null,
    kit.choiceItem(
      { selected: () => Boolean(from()), icon: 'branch', title: 'A new worktree that starts from a branch you pick', onClick: openBranches },
      ...menuText(kit, { title: 'From another branch…', detail: from() }),
    ),
    defaultRow(menu, place),
  )
}

export const chipMenu = (menu: ChipMenu) => {
  const page = sig<'main' | 'existing'>('main')
  const place = menu.model.place()
  if (!place) return null
  const showMain = () => page.set('main')
  const showExisting = () => page.set('existing')
  return dynamicChild(page, which =>
    which === 'existing' ? existingList(menu, otherWorktrees(menu.cache.get(place), repoOf(menu.model.status.get())), showMain) : mainList(menu, place, showExisting),
  )
}
