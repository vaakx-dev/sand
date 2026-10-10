import type { ThreadDraft } from '@sand/composer-card/contract'
import type { NavList } from '@sand/dom'
import type { Context } from 'drydock'
import { backgroundOf } from './background'
import { itemCache } from './cache'
import { draftItem, draftNavId, navItems, type Places } from './items'
import { draftMenu, threadMenu } from './menu'
import { moveThread } from './order'
import { prefetcher } from './prefetch'
import { projectLookup } from './project-lookup'
import { visibleAncestor } from './selection'

const openDraft = (ctx: Context<'threads'>, draft: ThreadDraft) =>
  ctx.threads.draft(draft.cwd, draft.device, draft.id).then(() => ctx.composer?.focus())

const draftOf = (ctx: Context, id: string) => ctx.drafts?.list().find(draft => draftNavId(draft.id) === id)

export const threadNavList = (ctx: Context<'threads'>, epoch: () => number): NavList => {
  const places: Places = {
    machine: device => ctx.machines?.get(device)?.name,
    branch: (cwd, device) => ctx.branches?.of(cwd, device),
  }
  const lookup = projectLookup(ctx)
  const background = backgroundOf(ctx)
  const cache = itemCache(epoch)
  const prefetch = prefetcher(ctx.threads)
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
      if (draft) void openDraft(ctx, draft)
      else void ctx.threads.select(id)
    },
    prefetch,
    menu(id) {
      const draft = draftOf(ctx, id)
      return draft && ctx.drafts ? draftMenu(ctx.drafts, draft.id) : threadMenu(ctx, id)
    },
    move: (id, above, below) => moveThread(ctx.threads, id, above, below),
  }
}
