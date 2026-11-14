import { threadRoute } from '@sand/chat/contract'
import { visitsOf, type PaletteItem } from '@sand/palette/contract'
import type { ShellRow } from '@sand/ui-shell/contract'
import type { Projects, Thread } from '@sand/web-client/contract'
import { visibleThreads } from '../items/items'
import type { StartParts } from '../launch/start'
import { openThread } from '../open'

const projectName = (projects: Projects, thread: Thread) =>
  projects.shown({ path: thread.info.cwd, device: thread.device, project: thread.info.project, quick: thread.info.kind === 'quick' }).name

export interface SessionParts extends StartParts {
  rowOf(thread: Thread): ShellRow
}

const sessionItem = ({ ctx, shell, projects, rowOf }: SessionParts, thread: Thread, group: string): PaletteItem => ({
  id: `session:${thread.id}`,
  group,
  label: thread.info.title || 'Untitled thread',
  visits: visitsOf({ kind: threadRoute, id: thread.id }),
  row: () => rowOf(thread),
  search: `${projectName(projects, thread)} ${thread.info.cwd} ${thread.id}`,
  run: () => openThread(ctx, shell, thread.id),
})

export const sessionItems = (parts: SessionParts, group: string) =>
  visibleThreads(parts.threads.list())
    .filter(thread => thread.info.head)
    .map(thread => sessionItem(parts, thread, group))
