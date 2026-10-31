import type { DiffFile, DiffScope } from '@sand/git-diff/contract'
import { type GitPlace, type GitRepoLocal, placeKey, repoOf, samePlace } from '@sand/git/contract'
import { errorMessage } from '@sand/util'
import { owned } from '@sand/web-client/reactive'
import { batch, derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import type { ChangesContext } from '../inject'
import { currentScope } from '../scope/current'
import { scopeExtras } from '../scope/extras'
import { sameScope } from '../scope/scopes'
import type { ScopeSources } from '../scope/sources'
import { idleList, loadingList, sortedFiles, type ListState } from './list'
import { phaseOf } from './phase'
import { changedPaths, statusPrint } from './prints'

interface DiffTarget {
  at: GitPlace
  scope: DiffScope
}

const buildModel = (ctx: ChangesContext, sources: ScopeSources) => {
  const { current } = ctx.gitStatus
  const place = derive(() => current.get()?.place)
  const status = derive(() => current.get()?.status)
  const picks = sig<ReadonlyMap<string, string>>(new Map())
  const list = sig<ListState>(idleList)
  const reloads = sig(0)
  const bases = new Map<string, string>()
  const selection = ctx.diff.selection()
  const extras = scopeExtras(place, sources)
  let target: DiffTarget | undefined

  const loadPatch = (file: DiffFile) => {
    const goal = target
    if (!goal) return Promise.reject(new Error('No folder is open'))
    return ctx.gitDiff.patch({ cwd: goal.at.cwd, scope: goal.scope, path: file.path, from: file.from }, goal.at.device)
  }
  const patches = ctx.diff.patches(loadPatch, path => selection.clear(path))

  const repo = derive(() => repoOf(status.get()))
  const { scopeId, scope, fixed } = currentScope({ place, repo, picks, extras })
  const print = derive(() => {
    const local = repo.get()
    return local && !fixed.get() ? statusPrint(local) : ''
  })

  let ticket = 0
  let fetched = { print: '', reloads: 0, head: undefined as string | undefined }

  const fetchList = async (goal: DiffTarget, local: GitRepoLocal, everything: boolean) => {
    const mine = ++ticket
    try {
      const next = await ctx.gitDiff.diff({ cwd: goal.at.cwd, scope: goal.scope }, goal.at.device)
      if (mine !== ticket) return
      const before = list.get()
      if (next.baseLabel) bases.set(placeKey(goal.at), next.baseLabel)
      patches.files(next.files)
      list.set({ kind: 'ready', list: next })
      if (everything) patches.stale()
      else if (before.kind === 'ready') patches.stale(changedPaths(before.list, next, local.files.map(file => file.path)))
    } catch (error) {
      if (mine === ticket && list.get().kind !== 'ready') list.set({ kind: 'error', message: errorMessage(error) })
    }
  }

  const stop = () => {
    target = undefined
    ticket++
    patches.files([])
    selection.clear()
    list.set(idleList)
  }

  const sync = (local: GitRepoLocal | undefined, goal: DiffTarget | undefined, now: string, reload: number) => {
    if (!goal || !local) return stop()
    const fresh = !target || !samePlace(target.at, goal.at) || !sameScope(target.scope, goal.scope)
    if (!fresh && now === fetched.print && reload === fetched.reloads) return
    const everything = !fresh && (local.head !== fetched.head || reload !== fetched.reloads)
    fetched = { print: now, reloads: reload, head: local.head }
    if (fresh) {
      target = goal
      patches.files([])
      batch(() => {
        selection.clear()
        list.set(loadingList)
      })
    }
    void fetchList(goal, local, everything)
  }

  effect(() => {
    const at = place.get()
    const known = status.get()
    const goalScope = scope.get()
    const now = print.get()
    const reload = reloads.get()
    untrack(() => {
      if (!at) return stop()
      if (!known) return
      sync(repo.get(), goalScope && { at, scope: goalScope }, now, reload)
    })
  })

  const phase = derive(() => phaseOf(place.get(), status.get(), list.get()))
  const visible = sig(false)
  effect(() => {
    const now = phase.get()
    if (now !== 'waiting') visible.set(now !== 'no-folder' && now !== 'no-repo')
  })

  const baseLabel = derive(() => {
    const state = list.get()
    const at = place.get()
    const fromList = state.kind === 'ready' ? state.list.baseLabel : undefined
    return fromList ?? (at && bases.get(placeKey(at))) ?? status.get()?.remote?.base ?? repo.get()?.defaultBranch
  })

  return {
    place,
    repo,
    scope,
    scopeId,
    extras,
    list,
    patches,
    selection,
    baseLabel,
    files: derive(() => sortedFiles(list.get())),
    badge: derive(() => repo.get()?.fileCount || undefined),
    phase,
    visible,
    pick(id: string) {
      const at = place.get()
      if (!at) return
      const all = new Map(picks.get())
      all.set(placeKey(at), id)
      picks.set(all)
    },
    reload() {
      if (list.get().kind === 'error') list.set(loadingList)
      reloads.update(count => count + 1)
    },
  }
}

export const changesModel = (ctx: ChangesContext, sources: ScopeSources) => owned(ctx, () => buildModel(ctx, sources))

export type ChangesModel = ReturnType<typeof buildModel>
