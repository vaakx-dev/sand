import type { GitPlace } from '@sand/git/contract'
import { type Worktree, worktreesChange, worktreesList } from '@sand/worktrees/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import { placeKey } from '../paths'

export const worktreeCache = (ctx: WorkspaceContext) => {
  const lists = new Map<string, Worktree[]>()
  const places = new Map<string, GitPlace>()
  const loading = new Map<string, Promise<Worktree[]>>()
  const version = sig(0)

  const load = (place: GitPlace) => {
    const key = placeKey(place)
    const pending = loading.get(key)
    if (pending) return pending
    places.set(key, place)
    const call = ctx.wire
      .call(worktreesList, { cwd: place.cwd }, place.device)
      .then(list => {
        lists.set(key, list)
        version.update(value => value + 1)
        return list
      })
      .finally(() => loading.delete(key))
    loading.set(key, call)
    return call
  }

  const get = (place: GitPlace) => {
    version.get()
    return lists.get(placeKey(place))
  }

  const ensure = (place: GitPlace) => {
    if (!lists.has(placeKey(place))) void load(place).catch(() => undefined)
  }

  const reload = (device: string) => {
    for (const [key, place] of places) if (place.device === device && lists.has(key)) void load(place).catch(() => undefined)
  }

  ctx.effect(() => ctx.wire.on(worktreesChange, (_change, device) => reload(device), { from: 'all' }))

  return { get, load, ensure }
}

export type WorktreeCache = ReturnType<typeof worktreeCache>
