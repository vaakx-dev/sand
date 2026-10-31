import { show, span } from '@vaakx-dev/vrui'
import type { ControlParts } from '../parts'
import { actionButton } from './button'
import { branchChip } from './chip'

export const gitControl = (parts: ControlParts) =>
  show(
    () => Boolean(parts.model.place.get()),
    () => span({ class: 'flex min-w-0 items-center gap-2' }, branchChip(parts), actionButton(parts)),
  )
