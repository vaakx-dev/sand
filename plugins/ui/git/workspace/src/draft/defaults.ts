import type { GitPlace } from '@sand/git/contract'
import { type WorkspaceKind, worktreesDefaults } from '@sand/worktrees/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { placeKey } from '../paths'

export const workspaceDefaults = (ctx: WorkspaceContext) => {
  const kinds = sig(new Map<string, WorkspaceKind>())

  const remember = (place: GitPlace, kind: WorkspaceKind) => kinds.update(all => new Map(all).set(placeKey(place), kind))

  const get = (place: GitPlace) => kinds.get().get(placeKey(place))

  const load = (place: GitPlace) => {
    if (kinds.get().has(placeKey(place))) return
    void ctx.wire
      .call(worktreesDefaults, { cwd: place.cwd }, place.device)
      .then(found => remember(place, found.kind))
      .catch(() => undefined)
  }

  const set = async (place: GitPlace, kind: WorkspaceKind) => {
    const saved = await ctx.wire.call(worktreesDefaults, { cwd: place.cwd, set: { kind } }, place.device)
    remember(place, saved.kind)
  }

  return { get, load, set }
}

export type WorkspaceDefaults = ReturnType<typeof workspaceDefaults>
