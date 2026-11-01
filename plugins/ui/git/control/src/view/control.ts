import { repoOf } from '@sand/git/contract'
import { show, span } from '@vaakx-dev/vrui'
import type { ControlParts } from '../parts'
import { menuButton, nextButton } from './button'
import { branchChip } from './chip'

export const controlRow = (parts: ControlParts) =>
  show(
    () => Boolean(repoOf(parts.model.status.get())),
    () => parts.kit.paneHead({ led: true }, branchChip(parts), span({ class: 'flex-1' }), nextButton(parts), menuButton(parts)),
  )
