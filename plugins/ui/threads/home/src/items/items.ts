import { draftRoute, threadRoute } from '@sand/chat/contract'
import { drafts, type Drafts, type ThreadDraft } from '@sand/composer/contract'
import type { ShellRow, Status } from '@sand/ui-shell/contract'
import { plural } from '@sand/util'
import type { Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { awayPcName } from '../palette/places'
import { isBack, snoozedUntil } from '../snooze/actions'
import { backLabel } from '../snooze/when'
import { runningAgents, type AgentsOf } from './agents'
import { projectLookup, quick, type ProjectInfo, type ProjectLookup } from './lookup'
import { draftMenu, threadMenu, type MenuParts } from './menu'

export interface Entry {
  row: ShellRow
  moved: number
  pinned?: boolean
  snoozed?: number
}

const positionOf = (thread: Thread) => thread.info.position ?? thread.info.created

export const visibleThreads = (threads: Thread[]) => threads.filter(thread => thread.info.kind !== 'agent').sort((a, b) => positionOf(b) - positionOf(a))

const statusOf = (thread: Thread, agents: number): Status | undefined => {
  if (thread.waiting) return 'waiting'
  if (thread.running || agents) return 'running'
  return thread.info.settled ? 'done' : undefined
}

const noteOf = (thread: Thread, agents: number, snoozed: number | undefined) => {
  if (thread.waiting) return thread.waiting.title
  if (snoozed) return backLabel(snoozed)
  if (isBack(thread)) return 'Back from snooze'
  if (!thread.running && agents) return agents === 1 ? '1 agent running' : `${agents} agents running`
  return undefined
}

const metaOf = (ctx: Context, project: ProjectInfo, device: string) =>
  [project.quick ? undefined : project.name, awayPcName(ctx, device)].filter(Boolean).join(' · ') || undefined

const threadEntry = (parts: MenuParts, thread: Thread, lookup: ProjectLookup, agentsOf: AgentsOf): Entry => {
  const project = thread.info.kind === 'quick' ? quick(thread.device) : lookup(thread.info.cwd, thread.device, thread.info.project)
  const { agents, since } = agentsOf(thread.id)
  const snoozed = snoozedUntil(thread)
  const started = thread.running ? thread.started : since
  return {
    row: {
      id: thread.id,
      label: thread.info.title || (project.quick ? project.name : 'Untitled thread'),
      detail: noteOf(thread, agents, snoozed),
      meta: metaOf(parts.ctx, project, thread.device),
      at: snoozed ? undefined : (started ?? thread.info.updated),
      status: statusOf(thread, agents),
      to: { kind: threadRoute, id: thread.id },
      menu: () => threadMenu(parts, thread.id),
    },
    moved: isBack(thread) ? Math.max(thread.info.updated, thread.info.snoozed ?? 0) : thread.info.updated,
    pinned: thread.info.pinned,
    snoozed,
  }
}

const draftTitle = (draft: ThreadDraft) => draft.text.trim().split('\n', 1)[0]?.trim() || plural(draft.attachments, 'attachment')

const draftEntry = (ctx: Context, saved: Drafts, draft: ThreadDraft, lookup: ProjectLookup): Entry => ({
  row: {
    id: `draft:${draft.id}`,
    label: draftTitle(draft),
    detail: 'Draft',
    meta: metaOf(ctx, lookup(draft.cwd, draft.device), draft.device),
    at: draft.updated,
    to: { kind: draftRoute, id: draft.id },
    menu: () => draftMenu(saved, draft.id),
  },
  moved: draft.updated,
})

export const threadEntries = (parts: MenuParts): Entry[] => {
  const lookup = projectLookup(parts.ctx)
  const saved = parts.ctx.get(drafts)
  const draftEntries = saved ? saved.list().map(draft => draftEntry(parts.ctx, saved, draft, lookup)) : []
  const agentsOf = runningAgents(parts.ctx, parts.threads)
  return [...draftEntries, ...visibleThreads(parts.threads.list()).map(thread => threadEntry(parts, thread, lookup, agentsOf))]
}
