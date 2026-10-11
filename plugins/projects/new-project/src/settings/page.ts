import { contextMenu, div, type Pulse } from '@sand/dom'
import type { ProjectsContext } from '../context'
import { groupsSection } from './groups'
import { liveTicks } from './live'
import { rootsSection } from './roots'

export const projectsPage = (ctx: ProjectsContext, changes: Pulse) => {
  const live = liveTicks(ctx, ['threads.change', 'sync.change'])
  const menu = contextMenu()
  return div({ class: 'flex flex-col gap-6', onMount: live.mount }, menu.view(), groupsSection(ctx, menu, changes, live.tick), rootsSection(ctx, changes))
}
