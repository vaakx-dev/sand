import { draftsChange } from '@sand/composer/contract'
import type { GitPlace, GitStatus } from '@sand/git/contract'
import { type DraftTarget, threadSelect, threadsChange } from '@sand/web-client/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { WorkspaceContext } from '../inject'
import { placeKey, repoOf } from '../paths'
import type { WorktreeCache } from '../worktrees/cache'
import { choiceOfKind, type WorkspaceChoice } from './choice'
import type { DraftChoices } from './choices'
import type { WorkspaceDefaults } from './defaults'

const sameDraft = (a: DraftTarget | undefined, b: DraftTarget | undefined) => a?.id === b?.id && a?.cwd === b?.cwd && a?.device === b?.device

export const placeOfDraft = (draft: DraftTarget | undefined): GitPlace | undefined => (draft?.cwd ? { cwd: draft.cwd, device: draft.device } : undefined)

export const followDraft = (ctx: WorkspaceContext, cache: WorktreeCache, choices: DraftChoices, defaults: WorkspaceDefaults) => {
  const draft = sig<DraftTarget | undefined>(undefined)
  const status = sig<GitStatus | undefined>(undefined)
  let stop: Dispose | undefined
  let followed: string | undefined
  let ticket = 0

  const untrack = () => {
    ticket++
    void stop?.()
    stop = undefined
  }

  const received = (at: GitPlace, next: GitStatus | undefined) => {
    status.set(next)
    if (!repoOf(next)) return
    defaults.load(at)
    cache.ensure(at)
  }

  const track = (at: GitPlace | undefined) => {
    untrack()
    status.set(undefined)
    if (!at) return
    const mine = ticket
    received(at, ctx.gitStatus.current(at))
    stop = ctx.gitStatus.follow(at, next => {
      if (mine === ticket) received(at, next)
    })
  }

  const sync = () => {
    const next = ctx.threads.drafting()
    if (!sameDraft(next, draft.get())) draft.set(next)
    const at = placeOfDraft(next)
    const key = at && placeKey(at)
    if (key === followed) return
    followed = key
    track(at)
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(draftsChange, sync)
  ctx.effect(() => {
    sync()
    return () => {
      untrack()
      followed = undefined
    }
  })

  const choiceFor = (target: DraftTarget): WorkspaceChoice => choices.get(target.id) ?? choiceOfKind(defaults.get(target))

  const current = derive(() => {
    const target = draft.get()
    return target ? choiceFor(target) : choiceOfKind(undefined)
  })

  const choose = (choice: WorkspaceChoice) => {
    const target = draft.get()
    if (target) choices.set(target.id, choice)
  }

  const place = () => placeOfDraft(draft.get())

  const visible = derive(() => Boolean(placeOfDraft(draft.get())) && Boolean(repoOf(status.get())))

  return { draft, status, current, visible, place, choose, choiceFor }
}

export type DraftModel = ReturnType<typeof followDraft>
