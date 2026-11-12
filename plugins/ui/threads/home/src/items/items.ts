import type { ThreadChanges } from '@sand/changes/contract'
import { draftRoute, threadRoute } from '@sand/chat/contract'
import { drafts, type Drafts, type ThreadDraft } from '@sand/composer/contract'
import type { ShellRow, Status } from '@sand/ui-shell/contract'
import { plural } from '@sand/util'
import type { ProjectShown, Thread } from '@sand/web-client/contract'
import { changeStatus, type Changes } from '../changes'
import type { RowPart } from '../contract'
import { awayPcName } from '../palette/places'
import { isBack, snoozedUntil } from '../snooze/actions'
import { backLabel } from '../snooze/when'
import { runningJobs, type JobsOf } from './jobs'
import type { RowLooks } from './looks'
import { draftMenu, threadMenu, type MenuParts } from './menu'

export interface Entry {
  row: ShellRow
  moved: number
  snoozed?: number
  settled?: boolean
  pinned?: boolean
}

const positionOf = (thread: Thread) => thread.info.position ?? thread.info.created

export const visibleThreads = (threads: Thread[]) => threads.filter(thread => thread.info.kind !== 'agent').sort((a, b) => positionOf(b) - positionOf(a))

export const statusOf = (thread: Thread, jobs: number, change: ThreadChanges | undefined): Status | undefined => {
  if (thread.waiting) return 'waiting'
  if (thread.running || jobs) return 'running'
  return changeStatus(change)
}

export interface RowSources {
  changes: Changes
  trail: RowPart[]
  looks: RowLooks
}

const projectPlaceOf = (parts: MenuParts, looks: RowLooks, project: ProjectShown) => ({
  label: project.name,
  mark: looks.mark(parts.kit, project),
})

const placeOf = (parts: MenuParts, looks: RowLooks, project: ProjectShown, device: string) => {
  const place = projectPlaceOf(parts, looks, project)
  return { ...place, label: [place.label, awayPcName(parts.ctx, device)].filter(Boolean).join(' · ') }
}

const threadEntry = (parts: MenuParts, thread: Thread, jobsOf: JobsOf, { changes, trail, looks }: RowSources): Entry => {
  const change = changes.get(thread.id)
  const project = parts.projects.shown({ path: thread.info.cwd, device: thread.device, project: thread.info.project, quick: thread.info.kind === 'quick' })
  const { jobs, since } = jobsOf(thread.id)
  const snoozed = snoozedUntil(thread)
  const started = thread.running ? thread.started : since
  return {
    row: {
      id: thread.id,
      label: thread.info.title || 'Untitled thread',
      place: placeOf(parts, looks, project, thread.device),
      trail: looks.trail(trail, { id: thread.id, cwd: thread.info.cwd, device: thread.device }),
      ...(snoozed ? { end: backLabel(snoozed) } : { at: started ?? thread.info.updated }),
      status: statusOf(thread, jobs, change),
      to: { kind: threadRoute, id: thread.id },
      menu: () => threadMenu(parts, thread.id),
    },
    moved: isBack(thread) ? Math.max(thread.info.updated, thread.info.snoozed ?? 0) : thread.info.updated,
    snoozed,
    settled: Boolean(thread.info.settled),
    pinned: Boolean(thread.info.pinned),
  }
}

const draftTitle = (draft: ThreadDraft) => draft.text.trim().split('\n', 1)[0]?.trim() || plural(draft.attachments, 'attachment')

const draftEntry = (parts: MenuParts, looks: RowLooks, saved: Drafts, draft: ThreadDraft): Entry => ({
  row: {
    id: `draft:${draft.id}`,
    label: draftTitle(draft),
    end: 'Draft',
    place: projectPlaceOf(parts, looks, parts.projects.shown({ path: draft.cwd, device: draft.device })),
    at: draft.updated,
    to: { kind: draftRoute, id: draft.id },
    menu: () => draftMenu(saved, draft.id),
  },
  moved: draft.updated,
})

export const threadEntries = (parts: MenuParts, sources: RowSources): Entry[] => {
  const saved = parts.ctx.get(drafts)
  const draftEntries = saved ? saved.list().map(draft => draftEntry(parts, sources.looks, saved, draft)) : []
  const jobsOf = runningJobs(parts.ctx, parts.threads)
  const listed = visibleThreads(parts.threads.list())
  return [...draftEntries, ...listed.map(thread => threadEntry(parts, thread, jobsOf, sources))]
}
