import type { GitPlace } from '@sand/git/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { projects } from '@sand/web-client/contract'
import { div, dynamicChild, show, sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { menuText } from '../menu-text'
import { defaultBranch, repoOf } from '../paths'
import type { WorktreeCache } from '../worktrees/cache'
import { checkoutLabel, kindOf, type WorkspaceChoice } from './choice'
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
  const detail = () =>
    kindOf(model.current.get()) === 'worktree' ? 'New threads start in a new worktree' : 'New threads start in the main checkout'
  return show(differs, () =>
    div(
      { class: 'flex flex-col' },
      kit.menuSeparator(),
      kit.menuItem({ icon: 'star', onClick: menu.makeDefault }, menuText(kit, { title: `Make this the default for ${project}`, detail: detail() })),
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
      menuText(kit, { title: checkoutLabel(local), detail: local?.branch ? `On ${local.branch}` : undefined }),
    ),
    kit.choiceItem(
      { selected: () => isNewFromDefault(current()), icon: 'worktree', onClick: () => pick({ kind: 'new' }) },
      menuText(kit, { title: `New worktree from ${defaultBranch(local)}`, detail: 'Its own folder and branch, named from your first message' }),
    ),
    kit.choiceItem(
      { selected: () => current().kind === 'existing', icon: 'worktree', disabled: trees.length === 0, onClick: showExisting },
      menuText(kit, trees.length ? { title: 'Existing worktree…', detail: existingSummary(trees) } : { title: 'Existing worktree…', reason: 'No other worktrees yet' }),
    ),
    kit.choiceItem(
      { selected: () => Boolean(from()), icon: 'branch', onClick: openBranches },
      menuText(kit, { title: 'Start from another branch…', detail: from() ? `New worktree from ${from()}` : undefined }),
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
