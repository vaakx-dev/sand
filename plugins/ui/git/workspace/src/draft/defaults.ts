import { isPcUnavailable } from '@sand/devices-contract'
import { type GitPlace, placeKey } from '@sand/git/contract'
import type { WorkspaceKind } from '@sand/worktrees/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'

export const workspaceDefaults = (ctx: WorkspaceContext) => {
  const kinds = sig(new Map<string, WorkspaceKind>())

  const remember = (place: GitPlace, kind: WorkspaceKind) => kinds.update(all => new Map(all).set(placeKey(place), kind))

  const get = (place: GitPlace) => kinds.get().get(placeKey(place))

  const load = (place: GitPlace) => {
    if (kinds.get().has(placeKey(place))) return
    void ctx.worktrees
      .defaults({ cwd: place.cwd }, place.device)
      .then(found => remember(place, found.kind))
      .catch(error => {
        if (!isPcUnavailable(error)) ctx.report(error)
      })
  }

  const set = async (place: GitPlace, kind: WorkspaceKind) => {
    const saved = await ctx.worktrees.defaults({ cwd: place.cwd, set: { kind } }, place.device)
    remember(place, saved.kind)
  }

  return { get, load, set }
}

export type WorkspaceDefaults = ReturnType<typeof workspaceDefaults>
