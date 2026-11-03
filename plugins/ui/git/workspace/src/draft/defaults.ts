import { isPcUnavailable } from '@sand/devices-contract'
import { type GitPlace, placeKey } from '@sand/git/contract'
import type { WorkspaceKind } from '@sand/worktrees/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'

export const workspaceDefaults = (ctx: WorkspaceContext) => {
  const kinds = sig(new Map<string, WorkspaceKind | null>())
  const global = sig<WorkspaceKind | undefined>(undefined)

  const quiet = (error: unknown) => {
    if (!isPcUnavailable(error)) ctx.report(error)
  }

  const remember = (place: GitPlace, kind: WorkspaceKind | undefined) => kinds.update(all => new Map(all).set(placeKey(place), kind ?? null))

  const get = (place: GitPlace) => kinds.get().get(placeKey(place)) ?? global.get()

  const loadGlobal = () =>
    void ctx.worktrees
      .global({})
      .then(found => global.set(found.kind))
      .catch(quiet)

  const load = (place: GitPlace) => {
    if (global.get() === undefined) loadGlobal()
    if (kinds.get().has(placeKey(place))) return
    void ctx.worktrees
      .defaults({ cwd: place.cwd }, place.device)
      .then(found => remember(place, found.kind))
      .catch(quiet)
  }

  const set = async (place: GitPlace, kind: WorkspaceKind) => {
    const saved = await ctx.worktrees.defaults({ cwd: place.cwd, set: { kind } }, place.device)
    remember(place, saved.kind)
  }

  const setGlobal = async (kind: WorkspaceKind) => {
    const saved = await ctx.worktrees.global({ set: { kind } })
    global.set(saved.kind)
  }

  return { get, load, set, global, loadGlobal, setGlobal }
}

export type WorkspaceDefaults = ReturnType<typeof workspaceDefaults>
