import type { NavList } from '@sand/protocol'
import type { Context } from 'drydock'
import { openDraft } from '../draft'
import { projectLookup } from '../project-lookup'
import { backgroundOf } from './background'
import { itemCache } from './cache'
import { draftItem, draftNavId, navItems, type Places } from './items'
import { draftMenu, threadMenu } from './menu'
import { moveThread } from './order'
import { prefetcher } from './prefetch'
import { visibleAncestor } from './selection'

const draftOf = (ctx: Context, id: string) => ctx.drafts?.list().find(draft => draftNavId(draft.id) === id)

export const threadNavList = (ctx: Context<'threads'>, epoch: () => number): NavList => {
  const places: Places = {
    machine: device => ctx.machines?.get(device)?.name,
    branch: (cwd, device) => ctx.branches?.of(cwd, device),
    worktree: (cwd, device) => Boolean(ctx.worktrees?.of(cwd, device)),
  }
  const lookup = projectLookup(ctx)
  const background = backgroundOf(ctx)
  const cache = itemCache(epoch)
  return {
    id: 'sessions',
    title: 'Threads',
    order: 10,
    items: () => [
      ...(ctx.drafts?.list() ?? []).map(draft => draftItem(draft, lookup, places)),
      ...navItems(ctx.threads.list(), lookup, places, background, cache),
    ],
    selected() {
      const drafting = ctx.threads.drafting()
      return visibleAncestor(ctx.threads, ctx.threads.current())?.id ?? (drafting && draftNavId(drafting.id))
    },
    select(id) {
      const draft = draftOf(ctx, id)
      if (draft) void openDraft(ctx, draft.cwd, draft.device, draft.id)
      else void ctx.threads.select(id)
    },
    prefetch: prefetcher(ctx.threads),
    menu(id) {
      const draft = draftOf(ctx, id)
      return draft && ctx.drafts ? draftMenu(ctx.drafts, draft.id) : threadMenu(ctx, id)
    },
    move: (id, above, below) => moveThread(ctx.threads, id, above, below),
  }
}
