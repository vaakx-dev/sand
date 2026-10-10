import { contextMenu, div, type Pulse } from '@sand/dom'
import { groupsSection } from './settings/groups'
import { liveTicks } from './settings/live'
import { rootsSection } from './settings/roots'
import type { ProjectsContext } from './settings/types'

export const projectsPage = (ctx: ProjectsContext, changes: Pulse) => {
  const live = liveTicks(ctx, ['threads.change', 'sync.change'])
  const menu = contextMenu()
  return div({ class: 'flex flex-col gap-6', onMount: live.mount }, menu.view(), groupsSection(ctx, menu, changes, live.tick), rootsSection(ctx, changes))
}
