import type { ThreadDraft } from '@sand/composer-card/contract'
import type { NavItem } from '@sand/dom'
import type { Thread } from '@sand/web-client/contract'
import { plural } from '@sand/kit'
import { noBackground, type BackgroundOf } from './background'
import { byPosition } from './order'
import type { ProjectLookup } from './project-lookup'

const place = (cwd: string) => cwd.split(/[\\/]/).filter(Boolean).slice(-3).join('/') || cwd

export const visibleThreads = (threads: Thread[]) => threads.filter(thread => thread.info.kind !== 'agent').sort(byPosition)

export type MachineName = (device: string) => string | undefined

export type BranchOf = (cwd: string, device?: string) => string | undefined

export interface Places {
  machine?: MachineName
  branch?: BranchOf
}

const where = (cwd: string, device: string | undefined, places: Places, quick?: boolean) => {
  const branch = quick ? undefined : places.branch?.(cwd, device)
  const at = quick ? '' : (branch ?? place(cwd))
  const pc = device && places.machine?.(device)
  const text = [pc, at].filter(Boolean).join(' · ')
  return { subtitle: text, subtitleIcon: branch ? 'branch' : 'folder' }
}

const stateOf = (thread: Thread, jobs: number): NavItem['state'] => (thread.running ? 'running' : jobs > 0 ? 'background' : 'idle')

const navItem = (thread: Thread, background: BackgroundOf, lookup: ProjectLookup, places: Places): NavItem => {
  const { count, since } = background(thread.id)
  const project = lookup(thread.info.cwd, thread.device, thread.info.project)
  const at = where(thread.info.cwd, thread.device, places, project.quick)
  return {
    id: thread.id,
    title: thread.info.title ?? 'Untitled thread',
    project: project.name,
    projectKey: project.key,
    icon: project.icon,
    subtitle: thread.info.kind === 'branch' ? ['branch', at.subtitle].filter(Boolean).join(' · ') : at.subtitle,
    subtitleIcon: at.subtitleIcon,
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

export const navItems = (threads: Thread[], lookup: ProjectLookup, places: Places = {}, background: BackgroundOf = noBackground) =>
  visibleThreads(threads).map(thread => navItem(thread, background, lookup, places))

export const draftNavId = (id: string) => `draft:${id}`

const draftTitle = (draft: ThreadDraft) =>
  draft.text.trim().split('\n', 1)[0]!.trim() || plural(draft.attachments, 'attachment')

export const draftItem = (draft: ThreadDraft, lookup: ProjectLookup, places: Places = {}): NavItem => {
  const project = lookup(draft.cwd, draft.device)
  return {
    id: draftNavId(draft.id),
    title: draftTitle(draft),
    project: project.name,
    projectKey: project.key,
    icon: project.icon,
    ...where(draft.cwd, draft.device, places, project.quick),
    path: draft.cwd,
    updated: draft.updated,
    state: 'draft',
  }
}
