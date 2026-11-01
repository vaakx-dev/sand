import type { ThreadDraft } from '@sand/composer/contract'
import { plural } from '@sand/util'
import type { Thread } from '@sand/web-client/contract'
import { isBack, snoozedUntil } from '../snooze/actions'
import type { ThreadItem } from './item'
import { quick, type ProjectLookup } from './lookup'
import { byPosition } from './order'

export type PcIcons = (device: string) => (() => HTMLElement) | undefined

export type AgentsOf = (thread: string) => { agents: number; since?: number }

export const visibleThreads = (threads: Thread[]) => threads.filter(thread => thread.info.kind !== 'agent').sort(byPosition)

const projectOf = (thread: Thread, lookup: ProjectLookup) =>
  thread.info.kind === 'quick' ? quick(thread.device) : lookup(thread.info.cwd, thread.device, thread.info.project)

const threadItem = (thread: Thread, selected: boolean, lookup: ProjectLookup, pcIcons: PcIcons, agentsOf: AgentsOf): ThreadItem => {
  const project = projectOf(thread, lookup)
  const { agents, since } = agentsOf(thread.id)
  const state = thread.running ? 'running' : agents ? 'background' : 'idle'
  return {
    id: thread.id,
    title: thread.info.title || (project.quick ? project.name : 'Untitled thread'),
    projectKey: project.key,
    project: project.name,
    icon: project.icon,
    pcIcon: pcIcons(thread.device),
    path: thread.info.cwd,
    device: thread.device,
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

export const threadItems = (threads: Thread[], selected: string | undefined, lookup: ProjectLookup, pcIcons: PcIcons, agentsOf: AgentsOf) =>
  visibleThreads(threads).map(thread => threadItem(thread, thread.id === selected, lookup, pcIcons, agentsOf))

export const draftId = (id: string) => `draft:${id}`

const draftTitle = (draft: ThreadDraft) => draft.text.trim().split('\n', 1)[0]?.trim() || plural(draft.attachments, 'attachment')

export const draftItem = (draft: ThreadDraft, lookup: ProjectLookup, pcIcons: PcIcons): ThreadItem => {
  const project = lookup(draft.cwd, draft.device)
  return {
    id: draftId(draft.id),
    title: draftTitle(draft),
    projectKey: project.key,
    project: project.name,
    icon: project.icon,
    pcIcon: pcIcons(draft.device),
    path: draft.cwd,
    device: draft.device,
    updated: draft.updated,
    state: 'draft',
  }
}
