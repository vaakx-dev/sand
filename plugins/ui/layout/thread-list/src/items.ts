import type { NavItem, Thread, ThreadDraft } from '@sand/protocol'
import { plural } from '@sand/kit'
import { noBackground, type BackgroundOf } from './background'
import { byPosition } from './order'
import type { ProjectLookup } from './project-lookup'

const place = (cwd: string) => cwd.split(/[\\/]/).filter(Boolean).slice(-3).join('/') || cwd

export const visibleThreads = (threads: Thread[]) => threads.filter(thread => thread.info.kind !== 'agent').sort(byPosition)

export type MachineName = (device: string) => string | undefined

const where = (cwd: string, device?: string, machine?: MachineName, quick?: boolean) => {
  const at = quick ? 'quick thread' : place(cwd)
  const pc = device && machine?.(device)
  return pc ? `${pc} · ${at}` : at
}

const stateOf = (thread: Thread, jobs: number): NavItem['state'] => (thread.running ? 'running' : jobs > 0 ? 'background' : 'idle')

const navItem = (thread: Thread, background: BackgroundOf, lookup: ProjectLookup, machine?: MachineName): NavItem => {
  const { count, since } = background(thread.id)
  const project = lookup(thread.info.cwd, thread.device, thread.info.project)
  const at = where(thread.info.cwd, thread.device, machine, project.quick)
  return {
    id: thread.id,
    title: thread.info.title ?? 'Untitled thread',
    project: project.name,
    projectKey: project.key,
    icon: project.icon,
    subtitle: thread.info.kind === 'branch' ? `branch · ${at}` : at,
    path: thread.info.cwd,
    updated: thread.info.updated,
    started: thread.running ? thread.started : since,
    state: stateOf(thread, count),
    jobs: count || undefined,
    unread: thread.unread,
    pinned: Boolean(thread.info.pinned),
    settled: Boolean(thread.info.settled),
    movable: true,
  }
}

export const navItems = (threads: Thread[], lookup: ProjectLookup, machine?: MachineName, background: BackgroundOf = noBackground) =>
  visibleThreads(threads).map(thread => navItem(thread, background, lookup, machine))

export const draftNavId = (id: string) => `draft:${id}`

const draftTitle = (draft: ThreadDraft) =>
  draft.text.trim().split('\n', 1)[0]!.trim() || plural(draft.attachments, 'attachment')

export const draftItem = (draft: ThreadDraft, lookup: ProjectLookup, machine?: MachineName): NavItem => {
  const project = lookup(draft.cwd, draft.device)
  return {
    id: draftNavId(draft.id),
    title: draftTitle(draft),
    project: project.name,
    projectKey: project.key,
    icon: project.icon,
    subtitle: where(draft.cwd, draft.device, machine, project.quick),
    path: draft.cwd,
    updated: draft.updated,
    state: 'draft',
  }
}
