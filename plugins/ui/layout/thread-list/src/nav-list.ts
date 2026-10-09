import type { ThreadDraft } from '@sand/composer-card/contract'
import type { NavList } from '@sand/dom'
import type { Context } from 'drydock'
import { backgroundOf } from './background'
import { draftItem, draftNavId, navItems } from './items'
import { draftMenu, threadMenu } from './menu'
import { moveThread } from './order'
import { prefetcher } from './prefetch'
import { projectLookup } from './project-lookup'
import { visibleAncestor } from './selection'

const openDraft = (ctx: Context<'threads'>, draft: ThreadDraft) =>
  ctx.threads.draft(draft.cwd, draft.device, draft.id).then(() => ctx.composer?.focus())

const draftOf = (ctx: Context, id: string) => ctx.drafts?.list().find(draft => draftNavId(draft.id) === id)

export const threadNavList = (ctx: Context<'threads'>): NavList => {
  const machine = (device: string) => ctx.machines?.get(device)?.name
  const lookup = projectLookup(ctx)
  const background = backgroundOf(ctx)
  const prefetch = prefetcher(ctx.threads)
  return {
    id: 'sessions',
    title: 'Threads',
    order: 10,
    items: () => [...(ctx.drafts?.list() ?? []).map(draft => draftItem(draft, lookup, machine)), ...navItems(ctx.threads.list(), lookup, machine, background)],
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
      return draft && ctx.drafts ? draftMenu(ctx.drafts, draft.id) : threadMenu(ctx.threads, id)
    },
    move: (id, above, below) => moveThread(ctx.threads, id, above, below),
  }
}
