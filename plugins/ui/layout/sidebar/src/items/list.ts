import { composer, drafts } from '@sand/composer/contract'
import { jobs } from '@sand/jobs/contract'
import { machines, type Thread, type Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type { Kit } from '@sand/ui-kit/contract'
import { openDraft } from '../palette/projects'
import type { ThreadItem } from './item'
import { draftId, draftItem, threadItems, type AgentsOf, type Places } from './items'
import { projectLookup } from './lookup'
import { draftMenu, threadMenu } from './menu'
import { moveThread } from './order'

const prefetchLimit = 2

const visibleAncestor = (threads: Threads, thread: Thread | undefined) => {
  const seen = new Set<string>()
  let at = thread
  while (at?.info.kind === 'agent' && !seen.has(at.id)) {
    seen.add(at.id)
    at = at.info.parent ? threads.get(at.info.parent) : undefined
  }
  return at?.info.kind === 'agent' ? undefined : at
}

export const threadList = (ctx: Context, kit: Kit, threads: Threads) => {
  const places: Places = {
    machine: device => {
      const machine = ctx.get(machines)?.get(device)
      return machine && !machine.local ? machine.name : undefined
    },
  }
  const agentsOf: AgentsOf = thread => {
    const running = (ctx.get(jobs)?.list(thread) ?? []).filter(job => job.status === 'running')
    return { agents: running.length, since: running.length ? Math.min(...running.map(job => job.started)) : undefined }
  }
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
      const draftItems = (ctx.get(drafts)?.list() ?? []).map(draft => draftItem(draft, lookup, places))
      return [...draftItems, ...threadItems(threads.list(), selected(), lookup, places, agentsOf)]
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
