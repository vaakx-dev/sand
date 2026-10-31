import { draftsChange } from '@sand/composer/contract'
import { type GitPlace, repoOf, samePlace } from '@sand/git/contract'
import { type DraftTarget, threadSelect, threadsChange } from '@sand/web-client/contract'
import { derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import type { WorkspaceContext } from '../inject'
import type { WorktreeCache } from '../worktrees/cache'
import { choiceOfKind, type WorkspaceChoice } from './choice'
import type { DraftChoices } from './choices'
import type { WorkspaceDefaults } from './defaults'

const sameDraft = (a: DraftTarget | undefined, b: DraftTarget | undefined) => a?.id === b?.id && a?.cwd === b?.cwd && a?.device === b?.device

const placeOfDraft = (draft: DraftTarget | undefined): GitPlace | undefined => (draft?.cwd ? { cwd: draft.cwd, device: draft.device } : undefined)

export const followDraft = (ctx: WorkspaceContext, cache: WorktreeCache, choices: DraftChoices, defaults: WorkspaceDefaults) => {
  const draft = sig<DraftTarget | undefined>(ctx.threads.drafting())

  const sync = () => {
    const next = ctx.threads.drafting()
    if (!sameDraft(next, draft.get())) draft.set(next)
  }

  ctx.on(threadSelect, sync)
  ctx.on(threadsChange, sync)
  ctx.on(draftsChange, sync)

  const place = derive(() => placeOfDraft(draft.get()))
  const status = derive(() => {
    const at = place.get()
    const current = ctx.gitStatus.current.get()
    return at && current && samePlace(at, current.place) ? current.status : undefined
  })

  effect(() => {
    const at = place.get()
    if (!at || !repoOf(status.get())) return
    untrack(() => {
      defaults.load(at)
      cache.ensure(at)
    })
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

  const visible = derive(() => Boolean(place.get()) && Boolean(repoOf(status.get())))

  return { status, current, visible, place: () => place.get(), choose, choiceFor }
}

export type DraftModel = ReturnType<typeof followDraft>
