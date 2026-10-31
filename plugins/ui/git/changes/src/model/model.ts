import { gitDiff, type DiffScope } from '@sand/git-diff/contract'
import type { GitRepoLocal } from '@sand/git/contract'
import { owned } from '@sand/web-client/reactive'
import { batch, derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import type { ChangesContext } from '../inject'
import { followPlace } from '../place/follow'
import { placeKey, samePlace } from '../place/place'
import { defaultScope } from '../scope/scopes'
import { badgeOf, idleList, loadingList, sortedFiles, type ListState } from './list'
import { messageOf } from './message'
import { patchStore, type DiffTarget } from './patches'
import { phaseOf } from './phase'
import { changedPaths, statusPrint } from './prints'
import { lineSelection } from './selection'

const buildModel = (ctx: ChangesContext) => {
  const where = followPlace(ctx)
  const picks = sig<ReadonlyMap<string, DiffScope>>(new Map())
  const list = sig<ListState>(idleList)
  const reloads = sig(0)
  const bases = new Map<string, string>()
  const selection = lineSelection()
  const patches = patchStore(ctx.wire, selection.clearFor)

  const repo = derive(() => {
    const local = where.status.get()?.local
    return local?.repo ? local : undefined
  })
  const scope = derive(() => {
    const at = where.place.get()
    const local = repo.get()
    return at && local ? (picks.get().get(placeKey(at)) ?? defaultScope(local)) : undefined
  })
  const print = derive(() => {
    const local = repo.get()
    return local ? statusPrint(local) : ''
  })

  let target: DiffTarget | undefined
  let ticket = 0
  let fetched = { print: '', reloads: 0, head: undefined as string | undefined }

  const fetchList = async (goal: DiffTarget, local: GitRepoLocal, everything: boolean) => {
    const mine = ++ticket
    try {
      const next = await ctx.wire.call(gitDiff, { cwd: goal.at.cwd, scope: goal.scope }, goal.at.device)
      if (mine !== ticket) return
      const before = list.get()
      if (next.baseLabel) bases.set(placeKey(goal.at), next.baseLabel)
      patches.files(next.files)
      list.set({ kind: 'ready', list: next })
      if (everything) patches.invalidateAll()
      else if (before.kind === 'ready') patches.invalidate(changedPaths(before.list, next, local.files.map(file => file.path)))
    } catch (error) {
      if (mine === ticket && list.get().kind !== 'ready') list.set({ kind: 'error', message: messageOf(error) })
    }
  }

  const stop = () => {
    target = undefined
    ticket++
    patches.reset(undefined)
    selection.clear()
    list.set(idleList)
  }

  const sync = (local: GitRepoLocal | undefined, goal: DiffTarget | undefined, now: string, reload: number) => {
    if (!goal || !local) return stop()
    const fresh = !target || !samePlace(target.at, goal.at) || target.scope !== goal.scope
    if (!fresh && now === fetched.print && reload === fetched.reloads) return
    const everything = !fresh && (local.head !== fetched.head || reload !== fetched.reloads)
    fetched = { print: now, reloads: reload, head: local.head }
    if (fresh) {
      target = goal
      patches.reset(goal)
      batch(() => {
        selection.clear()
        list.set(loadingList)
      })
    }
    void fetchList(goal, local, everything)
  }

  effect(() => {
    const at = where.place.get()
    const status = where.status.get()
    const goalScope = scope.get()
    const now = print.get()
    const reload = reloads.get()
    untrack(() => {
      if (!at) return stop()
      if (!status) return
      sync(repo.get(), goalScope && { at, scope: goalScope }, now, reload)
    })
  })

  const phase = derive(() => phaseOf(where.place.get(), where.status.get(), list.get()))
  const visible = sig(false)
  effect(() => {
    const now = phase.get()
    if (now !== 'waiting') visible.set(now !== 'no-folder' && now !== 'no-repo')
  })

  const baseLabel = derive(() => {
    const state = list.get()
    const at = where.place.get()
    const fromList = state.kind === 'ready' ? state.list.baseLabel : undefined
    return fromList ?? (at && bases.get(placeKey(at))) ?? where.status.get()?.remote?.base ?? repo.get()?.defaultBranch
  })

  return {
    where,
    repo,
    scope,
    list,
    patches,
    selection,
    baseLabel,
    files: derive(() => sortedFiles(list.get())),
    badge: derive(() => badgeOf(list.get())),
    phase,
    visible,
    pick(next: DiffScope) {
      const at = where.place.get()
      if (!at) return
      const all = new Map(picks.get())
      all.set(placeKey(at), next)
      picks.set(all)
    },
    reload() {
      void where.refresh()
      if (list.get().kind === 'error') list.set(loadingList)
      reloads.update(count => count + 1)
    },
  }
}

export const changesModel = (ctx: ChangesContext) => owned(ctx, () => buildModel(ctx))

export type ChangesModel = ReturnType<typeof buildModel>
