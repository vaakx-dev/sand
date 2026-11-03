import type { WorkspaceKind } from '@sand/worktrees/contract'
import type { WorkspaceDefaults } from '../draft/defaults'
import type { WorkspaceContext } from '../inject'
import { toastId } from '../toast'

const kinds: { value: WorkspaceKind; label: string }[] = [
  { value: 'checkout', label: 'Checkout' },
  { value: 'worktree', label: 'Worktree' },
]

const title = 'New threads start in'

export const defaultSection = (ctx: WorkspaceContext, defaults: WorkspaceDefaults) => () => {
  const { segmented, settingsRow, settingsSection } = ctx.kit
  defaults.loadGlobal()
  const choose = (kind: WorkspaceKind) => {
    if (kind !== defaults.global.get()) void defaults.setGlobal(kind).catch(error => ctx.toasts.error(toastId, 'Could not save the default', error))
  }
  return settingsSection(
    { title: 'Worktrees' },
    settingsRow(
      { title, detail: 'A project can pick its own in the new-thread menu.' },
      segmented(kinds, defaults.global, choose, { label: title, inset: true }),
    ),
  )
}
