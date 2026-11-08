import type { ThreadChanges } from '@sand/changes/contract'
import { draftRoute, threadRoute } from '@sand/chat/contract'
import { drafts, type Drafts, type ThreadDraft } from '@sand/composer/contract'
import type { ShellRow, Status } from '@sand/ui-shell/contract'
import { plural } from '@sand/util'
import type { Thread } from '@sand/web-client/contract'
import { changeStatus, type Changes } from '../changes'
import type { RowPart, RowThread } from '../contract'
import { owned } from '../owners'
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

const statusOf = (thread: Thread, agents: number, change: ThreadChanges | undefined): Status | undefined => {
  if (thread.waiting) return 'waiting'
  if (thread.running || agents) return 'running'
  return changeStatus(change)
}

export interface RowSources {
  changes: Changes
  trail: RowPart[]
}

const placeOf = (parts: MenuParts, project: ProjectInfo, device: string) => ({
  label: [project.quick ? 'No project' : project.name, awayPcName(parts.ctx, device)].filter(Boolean).join(' · '),
  mark: () => parts.kit.projectIcon(project.name, project.icon, 14),
})

const trailOf = (trail: RowPart[], folder: RowThread) => (trail.length ? () => trail.map(part => part.render(folder)) : undefined)

const threadEntry = (parts: MenuParts, thread: Thread, lookup: ProjectLookup, agentsOf: AgentsOf, { changes, trail }: RowSources): Entry => {
  const change = changes.get(thread.id)
  const project = thread.info.kind === 'quick' ? quick(thread.device) : lookup(thread.info.cwd, thread.device, thread.info.project)
  const { agents, since } = agentsOf(thread.id)
  const snoozed = snoozedUntil(thread)
  const started = thread.running ? thread.started : since
  return {
    row: {
      id: thread.id,
      label: thread.info.title || (project.quick ? project.name : 'Untitled thread'),
      place: placeOf(parts, project, thread.device),
      trail: trailOf(trail, { id: thread.id, cwd: thread.info.cwd, device: thread.device }),
      ...(snoozed ? { end: backLabel(snoozed) } : { at: started ?? thread.info.updated }),
      status: statusOf(thread, agents, change),
      to: { kind: threadRoute, id: thread.id },
      menu: () => threadMenu(parts, thread.id),
    },
    moved: isBack(thread) ? Math.max(thread.info.updated, thread.info.snoozed ?? 0) : thread.info.updated,
    pinned: thread.info.pinned,
    snoozed,
  }
}

const draftTitle = (draft: ThreadDraft) => draft.text.trim().split('\n', 1)[0]?.trim() || plural(draft.attachments, 'attachment')

const draftEntry = (parts: MenuParts, saved: Drafts, draft: ThreadDraft, lookup: ProjectLookup): Entry => ({
  row: {
    id: `draft:${draft.id}`,
    label: draftTitle(draft),
    end: 'Draft',
    place: placeOf(parts, draft.cwd ? lookup(draft.cwd, draft.device) : quick(draft.device), draft.device),
    at: draft.updated,
    to: { kind: draftRoute, id: draft.id },
    menu: () => draftMenu(saved, draft.id),
  },
  moved: draft.updated,
})

export const threadEntries = (parts: MenuParts, sources: RowSources): Entry[] => {
  const lookup = projectLookup(parts.ctx)
  const saved = parts.ctx.get(drafts)
  const draftEntries = saved ? saved.list().map(draft => draftEntry(parts, saved, draft, lookup)) : []
  const agentsOf = runningAgents(parts.ctx, parts.threads)
  const listed = visibleThreads(parts.threads.list()).filter(thread => !thread.info.settled && !owned(parts.ctx, thread.id))
  return [...draftEntries, ...listed.map(thread => threadEntry(parts, thread, lookup, agentsOf, sources))]
}
