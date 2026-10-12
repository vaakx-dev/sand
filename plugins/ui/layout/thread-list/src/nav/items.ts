import type { ThreadDraft } from '@sand/composer-card/contract'
import type { NavItem } from '@sand/protocol'
import type { Thread } from '@sand/web-client/contract'
import { plural } from '@sand/kit'
import type { ProjectLookup } from '../project-lookup'
import { isBack, snoozedUntil } from '../snooze/actions'
import type { Background, BackgroundOf } from './background'
import type { ItemCache } from './cache'
import type { CreatorOf } from './creator'
import { byPosition } from './order'

const place = (cwd: string) => cwd.split(/[\\/]/).filter(Boolean).slice(-3).join('/') || cwd

export const visibleThreads = (threads: Thread[]) => threads.filter(thread => thread.info.kind !== 'agent').sort(byPosition)

export interface Places {
  machine(device: string): string | undefined
  branch(cwd: string, device: string): string | undefined
  worktree(cwd: string, device: string): boolean
}

const subtitleIcon = (worktree: boolean, branch: string | undefined) => {
  if (worktree) return 'folder-git'
  return branch ? 'branch' : 'folder'
}

const where = (cwd: string, device: string, places: Places, quick?: boolean): Pick<NavItem, 'subtitle' | 'subtitleIcon'> => {
  const branch = quick ? undefined : places.branch(cwd, device)
  const at = quick ? '' : (branch ?? place(cwd))
  const pc = places.machine(device)
  const worktree = !quick && places.worktree(cwd, device)
  return { subtitle: [pc, at].filter(Boolean).join(' · '), subtitleIcon: subtitleIcon(worktree, branch) }
}

const stateOf = (thread: Thread, jobs: number): NavItem['state'] => {
  if (thread.running) return 'running'
  return jobs > 0 ? 'background' : 'idle'
}

const navItem = (thread: Thread, { agents, shells, since, workflow }: Background, lookup: ProjectLookup, places: Places, creator: CreatorOf): NavItem => {
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
    state: stateOf(thread, agents + shells),
    agents: agents || undefined,
    shells: shells || undefined,
    workflow,
    unread: thread.unread,
    pinned: Boolean(thread.info.pinned),
    settled: Boolean(thread.info.settled),
    snoozed: snoozedUntil(thread),
    back: isBack(thread) || undefined,
    movable: true,
    creator: creator(thread),
  }
}

export const navItems = (threads: Thread[], lookup: ProjectLookup, places: Places, background: BackgroundOf, cache: ItemCache, creator: CreatorOf) =>
  visibleThreads(threads).map(thread => {
    const jobs = background(thread.id)
    return cache(thread, jobs, () => navItem(thread, jobs, lookup, places, creator))
  })

export const draftNavId = (id: string) => `draft:${id}`

const draftTitle = (draft: ThreadDraft) => draft.text.trim().split('\n', 1)[0]?.trim() || plural(draft.attachments, 'attachment')

export const draftItem = (draft: ThreadDraft, lookup: ProjectLookup, places: Places): NavItem => {
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
