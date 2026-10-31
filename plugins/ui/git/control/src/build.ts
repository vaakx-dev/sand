import { palette } from '@sand/palette/contract'
import { owned } from '@sand/web-client/reactive'
import { derive } from '@vaakx-dev/vrui'
import { createActions } from './actions/actions'
import { branchPage } from './branches/page'
import { commitOpener } from './commit/open'
import type { ControlContext } from './inject'
import { menuSections } from './menu/sections'
import { busyReason, waitReason } from './next/facts'
import type { ControlParts } from './parts'
import { followPrimary } from './primary/follow'
import { primaryRegistry } from './primary/registry'
import { createRuns } from './runs/runs'
import { followStatus } from './status/follow'

export const buildControl = (ctx: ControlContext) => {
  const model = followStatus(ctx)
  const runs = createRuns(ctx)
  const actions = createActions(ctx, model, runs)
  const commit = commitOpener(() => parts)
  const sections = menuSections()
  const registry = primaryRegistry()

  const openBranches = () => {
    const at = model.place.get()
    const found = ctx.get(palette)
    if (at && found) found.open(branchPage(parts, at))
  }

  const parts: ControlParts = owned(ctx, () => {
    const phase = () => runs.at(model.place.get())?.phase
    return {
      ctx,
      kit: ctx.kit,
      model,
      runs,
      actions,
      next: followPrimary({ ctx, model, runs, actions, registry }),
      waiting: derive(() => (model.running.get() ? waitReason : phase() ? busyReason : undefined)),
      sections,
      openCommit: commit.open,
      openBranches,
    }
  })

  return { parts, commit, sections, registry }
}
