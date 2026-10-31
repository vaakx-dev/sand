import { isLivePull } from '@sand/github/look'
import type { Child } from '@vaakx-dev/vrui'
import { editSheet } from '../edit/sheet'
import { updateItems } from '../main/update'
import { reviewersSheet } from '../reviewers/sheet'
import type { Shown } from '../shown'

export const githubItems = (shown: Shown, close: () => void): Child[] => {
  const { kit } = shown.parts
  const pull = shown.pull()
  const live = isLivePull(pull.state)
  const then = (run: () => void) => () => {
    close()
    run()
  }
  return [
    pull.state === 'open' && pull.canEdit ? kit.menuItem({ icon: 'pr-draft', onClick: then(() => void shown.actions.ready(false)) }, 'Convert to draft') : null,
    ...(live && pull.canEdit ? updateItems(shown, close) : []),
    pull.canEdit ? kit.menuItem({ icon: 'pencil', onClick: then(() => editSheet(shown)) }, 'Edit title and description') : null,
    live && pull.canEdit ? kit.menuItem({ icon: 'users', onClick: then(() => reviewersSheet(shown)) }, 'Request reviewers…') : null,
  ].filter(item => item !== null)
}
