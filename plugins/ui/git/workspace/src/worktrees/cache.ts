import { isPcUnavailable, pcHello } from '@sand/devices-contract'
import { type GitPlace, placeKey } from '@sand/git/contract'
import type { Worktree } from '@sand/worktrees/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'

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
    const call = ctx.worktrees
      .list({ cwd: place.cwd }, place.device)
      .then(list => {
        lists.set(key, list)
        version.update(value => value + 1)
        return list
      })
      .finally(() => loading.delete(key))
    loading.set(key, call)
    return call
  }

  const loadInBackground = (place: GitPlace) => {
    void load(place).catch(error => {
      if (!isPcUnavailable(error)) ctx.report(error)
    })
  }

  const get = (place: GitPlace) => {
    version.get()
    return lists.get(placeKey(place))
  }

  const ensure = (place: GitPlace) => {
    if (!lists.has(placeKey(place))) loadInBackground(place)
  }

  const reload = (device: string, missing: boolean) => {
    for (const [key, place] of places) if (place.device === device && lists.has(key) !== missing) loadInBackground(place)
  }

  ctx.effect(() => ctx.worktrees.onChange((_change, device) => reload(device, false)))
  ctx.on(pcHello, device => reload(device, true))

  return { get, load, ensure }
}

export type WorktreeCache = ReturnType<typeof worktreeCache>
