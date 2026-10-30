import type { ThreadDraft } from '@sand/composer/contract'
import { plural } from '@sand/util'
import type { Thread } from '@sand/web-client/contract'
import { isBack, snoozedUntil } from '../snooze/actions'
import type { ThreadItem } from './item'
import { quick, type ProjectInfo, type ProjectLookup } from './lookup'
import { byPosition } from './order'

export interface Places {
  pc(device: string): string | undefined
  mark(device: string): () => HTMLElement
}

export type AgentsOf = (thread: string) => { agents: number; since?: number }

const place = (cwd: string) => cwd.split(/[\\/]/).filter(Boolean).slice(-3).join('/') || cwd

export const visibleThreads = (threads: Thread[]) => threads.filter(thread => thread.info.kind !== 'agent').sort(byPosition)

const where = (project: ProjectInfo, cwd: string, device: string, places: Places): Pick<ThreadItem, 'project' | 'subtitle' | 'pcMark'> => {
  const pc = places.pc(device)
  const mark = pc ? { pcMark: places.mark(device) } : {}
  if (project.quick) return { project: [project.name, pc].filter(Boolean).join(' · '), ...mark }
  return { project: project.name, subtitle: [pc, !project.root && place(cwd)].filter(Boolean).join(' · ') || undefined, ...mark }
}

const projectOf = (thread: Thread, lookup: ProjectLookup) =>
  thread.info.kind === 'quick' ? quick(thread.device) : lookup(thread.info.cwd, thread.device, thread.info.project)

const threadItem = (thread: Thread, selected: boolean, lookup: ProjectLookup, places: Places, agentsOf: AgentsOf): ThreadItem => {
  const project = projectOf(thread, lookup)
  const { agents, since } = agentsOf(thread.id)
  const state = thread.running ? 'running' : agents ? 'background' : 'idle'
  return {
    id: thread.id,
    title: thread.info.title || (project.quick ? project.name : 'Untitled thread'),
    projectKey: project.key,
    icon: project.icon,
    ...where(project, thread.info.cwd, thread.device, places),
    path: thread.info.cwd,
    updated: thread.info.updated,
    started: thread.running ? thread.started : since,
    state,
    agents: agents || undefined,
    unread: !thread.info.seen && !selected,
    pinned: thread.info.pinned,
    settled: Boolean(thread.info.settled),
    snoozed: snoozedUntil(thread),
    back: isBack(thread) || undefined,
    movable: true,
  }
}

export const threadItems = (threads: Thread[], selected: string | undefined, lookup: ProjectLookup, places: Places, agentsOf: AgentsOf) =>
  visibleThreads(threads).map(thread => threadItem(thread, thread.id === selected, lookup, places, agentsOf))

export const draftId = (id: string) => `draft:${id}`

const draftTitle = (draft: ThreadDraft) => draft.text.trim().split('\n', 1)[0]?.trim() || plural(draft.attachments, 'attachment')

export const draftItem = (draft: ThreadDraft, lookup: ProjectLookup, places: Places): ThreadItem => {
  const project = lookup(draft.cwd, draft.device)
  return {
    id: draftId(draft.id),
    title: draftTitle(draft),
    projectKey: project.key,
    icon: project.icon,
    ...where(project, draft.cwd, draft.device, places),
    path: draft.cwd,
    updated: draft.updated,
    state: 'draft',
  }
}
