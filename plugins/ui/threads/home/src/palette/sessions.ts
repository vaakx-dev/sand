import type { PaletteItem } from '@sand/palette/contract'
import type { Projects, Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type { Changes } from '../changes'
import { runningJobs, type JobsOf } from '../items/jobs'
import { statusOf, visibleThreads } from '../items/items'
import type { StartParts } from '../launch/start'
import { openThread } from '../open'
import { awayPcName } from './places'

const projectName = (projects: Projects, thread: Thread) =>
  projects.shown({ path: thread.info.cwd, device: thread.device, project: thread.info.project, quick: thread.info.kind === 'quick' }).name

const detail = (ctx: Context, thread: Thread, project: string | false) => [project, awayPcName(ctx, thread.device), thread.info.pinned && 'pinned'].filter(Boolean).join(' · ')

export interface SessionParts extends StartParts {
  changes: Changes
}

interface Listed {
  group: string
  project: string
  mixed: boolean
  jobsOf: JobsOf
}

const sessionItem = ({ ctx, shell, changes }: SessionParts, thread: Thread, { group, project, mixed, jobsOf }: Listed): PaletteItem => ({
  id: `session:${thread.id}`,
  group,
  status: statusOf(thread, jobsOf(thread.id).jobs, changes.get(thread.id)),
  label: thread.info.title || 'Untitled thread',
  detail: detail(ctx, thread, mixed && project),
  at: thread.info.updated,
  search: `${project} ${thread.info.cwd} ${thread.id}`,
  run: () => openThread(ctx, shell, thread.id),
})

export const sessionItems = (parts: SessionParts, group: string) => {
  const shown = visibleThreads(parts.threads.list()).filter(thread => thread.info.head)
  const names = shown.map(thread => projectName(parts.projects, thread))
  const mixed = new Set(names).size > 1
  const jobsOf = runningJobs(parts.ctx, parts.threads)
  return shown.map((thread, index) => sessionItem(parts, thread, { group, project: names[index] ?? '', mixed, jobsOf }))
}
