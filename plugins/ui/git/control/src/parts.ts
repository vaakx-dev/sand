import type { Kit } from '@sand/ui-kit/contract'
import type { Derive } from '@vaakx-dev/vrui'
import type { Actions } from './actions/actions'
import type { ControlContext } from './inject'
import type { NextAction } from './next/action'
import type { Runs } from './runs/runs'
import type { StatusModel } from './status/follow'

export interface ControlParts {
  ctx: ControlContext
  kit: Kit
  model: StatusModel
  runs: Runs
  actions: Actions
  next: Derive<NextAction | undefined>
  waiting: Derive<string | undefined>
  openCommit(): void
  openBranches(): void
}
