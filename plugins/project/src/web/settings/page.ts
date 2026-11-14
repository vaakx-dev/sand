import type { Pulse } from '@sand/reactive'
import { div } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { groupsSections } from './groups'
import { rootsSection } from './roots'

export const projectsPage = (ctx: ProjectsContext, changes: Pulse) => {
  const { contextMenu } = ctx.kit
  const menu = contextMenu()
  return div({ class: 'flex flex-col gap-6' }, menu.view(), ...groupsSections(ctx, menu, changes), rootsSection(ctx, changes))
}
