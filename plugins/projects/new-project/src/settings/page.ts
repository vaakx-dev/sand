import type { Pulse } from '@sand/kit/web'
import { div } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { groupsSection } from './groups'
import { liveTicks } from './live'
import { rootsSection } from './roots'

export const projectsPage = (ctx: ProjectsContext, changes: Pulse) => {
  const { contextMenu } = ctx.kit
  const live = liveTicks(ctx, ['threads.change', 'sync.change'])
  const menu = contextMenu()
  return div({ class: 'flex flex-col gap-6', onMount: live.mount }, menu.view(), groupsSection(ctx, menu, changes, live.tick), rootsSection(ctx, changes))
}
