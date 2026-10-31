import { repoOf } from '@sand/git/contract'
import { derive } from '@vaakx-dev/vrui'
import type { Actions } from '../actions/actions'
import type { GitActionContext, GitRunContext } from '../contract'
import type { ControlContext } from '../inject'
import { nextAction } from '../next/action'
import { type ShownButton, shownButton } from '../next/shown'
import type { Runs } from '../runs/runs'
import type { StatusModel } from '../status/follow'
import { type Picked, pickPrimary } from './pick'
import type { PrimaryRegistry } from './registry'

export interface ShownAction extends ShownButton {
  run(): void
}

export interface PrimaryDeps {
  ctx: ControlContext
  model: StatusModel
  runs: Runs
  actions: Actions
  registry: PrimaryRegistry
}

export const followPrimary = ({ ctx, model, runs, actions, registry }: PrimaryDeps) => {
  const context = (): GitActionContext | undefined => {
    const place = model.place.get()
    const status = model.status.get()
    if (!place || !status || !repoOf(status)) return undefined
    const id = model.thread.get()
    return { status, place, thread: id ? ctx.threads.get(id) : undefined, base: nextAction(status) }
  }

  const runContext = (): GitRunContext | undefined => {
    const now = context()
    if (!now) return undefined
    return {
      ...now,
      commit: async request => (await actions.commitFully(request)) ?? false,
      push: async () => (await actions.push()) ?? false,
    }
  }

  const run = ({ owner }: Picked) => {
    const now = runContext()
    if (!now) return
    if (owner) void owner.run(now)
    else if (now.base) void actions.run(now.base)
  }

  return derive((): ShownAction | undefined => {
    const at = context()
    if (!at) return undefined
    const picked = pickPrimary(registry.list(), at)
    const button = shownButton(picked?.button, { running: model.running.get(), phase: runs.at(at.place)?.phase })
    return button && { ...button, run: () => picked && run(picked) }
  })
}
