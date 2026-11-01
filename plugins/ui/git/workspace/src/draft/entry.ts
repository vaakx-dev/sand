import { composer, type PlusEntry } from '@sand/composer/contract'
import { repoOf } from '@sand/git/contract'
import { palette } from '@sand/palette/contract'
import type { WorkspaceKind } from '@sand/worktrees/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { toastId } from '../toast'
import type { WorktreeCache } from '../worktrees/cache'
import { branchPage } from './branches'
import { choiceLabel, choiceOfKind, kindOf, type WorkspaceChoice } from './choice'
import type { WorkspaceDefaults } from './defaults'
import { type ChipMenu, chipMenu } from './menu'
import type { DraftModel } from './model'

const defaultSaved = (kind: string) => (kind === 'worktree' ? 'New threads here start in a new worktree' : 'New threads here start in the main checkout')

const isUsual = (choice: WorkspaceChoice, kind: WorkspaceKind | undefined) =>
  choice.kind === choiceOfKind(kind).kind && (choice.kind !== 'new' || !choice.from)

const shortLabel = (choice: WorkspaceChoice, label: string) => (choice.kind === 'new' && !choice.from ? 'New worktree' : label)

export const workspaceEntry = (ctx: WorkspaceContext, model: DraftModel, cache: WorktreeCache, defaults: WorkspaceDefaults, open: Sig<boolean>): PlusEntry => {
  const close = () => open.set(false)

  const pick = (choice: WorkspaceChoice) => {
    model.choose(choice)
    close()
    ctx.get(composer)?.focus()
  }

  const openBranches = () => {
    const place = model.place()
    close()
    if (place) ctx.get(palette)?.open(branchPage(ctx, model, place))
  }

  const makeDefault = () => {
    const place = model.place()
    const kind = kindOf(model.current.get())
    close()
    if (!place) return
    defaults.set(place, kind).then(
      () => ctx.toasts.show({ id: toastId, tone: 'success', title: 'Default saved', detail: defaultSaved(kind) }),
      error => ctx.toasts.error(toastId, 'Could not save the default', error),
    )
  }

  const menu: ChipMenu = { ctx, kit: ctx.kit, model, cache, defaults, pick, openBranches, makeDefault }
  const usualKind = () => {
    const place = model.place()
    return place && defaults.get(place)
  }
  const label = () => choiceLabel(model.current.get(), repoOf(model.status.get()))

  return {
    icon: () => (model.current.get().kind === 'checkout' ? 'branch' : 'worktree'),
    label,
    open,
    panel: () => chipMenu(menu),
    unusual: () => (isUsual(model.current.get(), usualKind()) ? undefined : shortLabel(model.current.get(), label())),
    reset: () => model.choose(choiceOfKind(usualKind())),
  }
}
