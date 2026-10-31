import { composer } from '@sand/composer/contract'
import { palette } from '@sand/palette/contract'
import { div, dynamicChild, show, type Sig, span } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { notify, notifyError } from '../notify'
import { repoOf } from '../paths'
import type { WorktreeCache } from '../worktrees/cache'
import { branchPage } from './branches'
import { choiceLabel, kindOf, type WorkspaceChoice } from './choice'
import type { WorkspaceDefaults } from './defaults'
import { type ChipMenu, chipMenu } from './menu'
import type { DraftModel } from './model'

export const shortcutHint = (mac: boolean) => (mac ? '⌘⇧X' : 'Ctrl⇧X')

const defaultSaved = (kind: string) => (kind === 'worktree' ? 'New threads here start in a new worktree' : 'New threads here start in the main checkout')

export const workspaceChip = (ctx: WorkspaceContext, model: DraftModel, cache: WorktreeCache, defaults: WorkspaceDefaults, open: Sig<boolean>) => {
  const { kit } = ctx
  const close = () => open.set(false)
  const toggle = () => open.update(value => !value)

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
      () => notify(ctx, { tone: 'success', title: 'Default saved', detail: defaultSaved(kind) }),
      error => notifyError(ctx, 'Could not save the default', error),
    )
  }

  const menu: ChipMenu = { ctx, kit, model, cache, defaults, pick, openBranches, makeDefault }
  const glyph = model.current.map(choice => (choice.kind === 'checkout' ? 'branch' : 'worktree'))
  const label = () => choiceLabel(model.current.get(), repoOf(model.status.get()))
  const title = () => `Where this thread works · ${shortcutHint(kit.isMac())}`

  return () =>
    div(
      { class: 'relative flex min-w-0' },
      kit.trayChip(
        { open, toggle, title },
        dynamicChild(glyph, name => kit.icon(name, 'sm')),
        span({ class: 'min-w-0 truncate' }, label),
      ),
      show(open, () => kit.chipPopover(close, { class: 'left-0 w-80' }, chipMenu(menu))),
    )
}
