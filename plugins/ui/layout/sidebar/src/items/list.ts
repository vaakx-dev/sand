import { composer, drafts } from '@sand/composer/contract'
import type { Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type { Kit } from '@sand/ui-kit/contract'
import { openDraft } from '../palette/projects'
import { runningAgents } from './agents'
import { visibleAncestor } from './ancestor'
import type { ThreadItem } from './item'
import { draftId, draftItem, threadItems } from './items'
import { projectLookup } from './lookup'
import { draftMenu, threadMenu } from './menu'
import { moveThread } from './order'
import { awayPcIcons } from './pc-icon'

const prefetchLimit = 2

export const threadList = (ctx: Context, kit: Kit, threads: Threads) => {
  const pcIcons = awayPcIcons(ctx, kit)
  const draftOf = (id: string) => ctx.get(drafts)?.list().find(draft => draftId(draft.id) === id)
  let fetching = 0

  const selected = () => {
    const drafting = threads.drafting()
    return visibleAncestor(threads, threads.current())?.id ?? (drafting && draftId(drafting.id))
  }

  return {
    selected,
    items(): ThreadItem[] {
      const lookup = projectLookup(ctx)
      const draftItems = (ctx.get(drafts)?.list() ?? []).map(draft => draftItem(draft, lookup, pcIcons))
      return [...draftItems, ...threadItems(threads.list(), selected(), lookup, pcIcons, runningAgents(ctx, threads))]
    },
    select(id: string) {
      const draft = draftOf(id)
      if (draft) void threads.draft(draft.cwd, draft.device, draft.id).then(() => ctx.get(composer)?.focus())
      else void threads.select(id)
    },
    prefetch(id: string) {
      const thread = threads.get(id)
      if (!thread || thread.loaded || thread.failed || fetching >= prefetchLimit) return
      fetching++
      void threads.load(id).finally(() => fetching--)
    },
    menuOf(id: string) {
      const draft = draftOf(id)
      const found = ctx.get(drafts)
      return draft && found ? draftMenu(found, draft.id) : threadMenu({ ctx, kit, threads }, id)
    },
    move: (id: string, above: string | undefined, below: string | undefined) => moveThread(threads, id, above, below),
    newThread: () => {
      const here = threads.drafting() ?? { cwd: threads.cwd(), device: threads.device() }
      return openDraft(ctx, threads, here.cwd, here.device)
    },
  }
}
