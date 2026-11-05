import { isLivePull } from '@sand/github/contract'
import type { Child } from '@vaakx-dev/vrui'
import { editSheet } from '../edit/sheet'
import { updateItem } from '../main/update'
import { reviewersSheet } from '../reviewers/sheet'
import type { Shown } from '../shown'

export const githubItems = (shown: Shown, close: () => void): Child[] => {
  const { kit } = shown.parts
  const pull = shown.pull()
  if (!pull.canEdit) return []
  const live = isLivePull(pull.state)
  const then = (run: () => void) => () => {
    close()
    run()
  }
  return [
    live && pull.behindBy !== 0 ? updateItem(shown, close) : null,
    kit.menuItem({ icon: 'pencil', onClick: then(() => editSheet(shown)) }, 'Edit title and description'),
    live ? kit.menuItem({ icon: 'users', onClick: then(() => reviewersSheet(shown)) }, 'Request reviewers…') : null,
    pull.state === 'open' ? kit.menuItem({ icon: 'pr-draft', onClick: then(() => void shown.actions.ready(false)) }, 'Convert to draft') : null,
  ].filter(item => item !== null)
}
