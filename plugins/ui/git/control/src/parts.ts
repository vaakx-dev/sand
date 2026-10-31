import type { Kit } from '@sand/ui-kit/contract'
import type { Derive } from '@vaakx-dev/vrui'
import type { Actions } from './actions/actions'
import type { ControlContext } from './inject'
import type { MenuSections } from './menu/sections'
import type { ShownAction } from './primary/follow'
import type { Runs } from './runs/runs'
import type { StatusModel } from './status/follow'

export interface ControlParts {
  ctx: ControlContext
  kit: Kit
  model: StatusModel
  runs: Runs
  actions: Actions
  next: Derive<ShownAction | undefined>
  waiting: Derive<string | undefined>
  sections: MenuSections
  openCommit(): void
  openBranches(): void
}
