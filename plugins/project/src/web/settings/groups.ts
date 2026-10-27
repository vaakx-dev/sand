import { palette } from '@sand/palette/contract'
import type { ContextMenu } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import type { ProjectGroup } from '@sand/web-client/contract'
import type { Pulse } from '@sand/web-client/reactive'
import { derive, dynamicChild, sig, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { sourcesPage } from '../new/sources'
import type { Picking } from './icon'
import { groupRow } from './row'

const heading = (groups: ProjectGroup[]) => {
  const pcs = new Set(groups.flatMap(group => group.locations.map(entry => entry.device))).size
  return groups.length ? `${plural(groups.length, 'project')} on ${plural(pcs, 'PC')}` : 'Your projects'
}

const addButton = (ctx: ProjectsContext) => {
  const { icon, quietButton } = ctx.kit
  const found = ctx.get(palette)
  return found ? quietButton({ size: 'sm', onClick: () => found.open(sourcesPage(ctx)) }, icon('plus', 'sm'), 'Add a project') : null
}

const hiddenToggle = (ctx: ProjectsContext, showHidden: Sig<boolean>) => {
  const { quietButton } = ctx.kit
  return showHidden.get() || ctx.projects.groups({ hidden: true }).some(group => group.hidden)
    ? quietButton({ size: 'sm', onClick: showHidden.toggle() }, showHidden.get() ? 'Hide hidden' : 'Show hidden')
    : null
}

export const groupsSection = (ctx: ProjectsContext, menu: ContextMenu, changes: Pulse) => {
  const { emptyState, settingsSection } = ctx.kit
  const showHidden = sig(false)
  const picking = sig<Picking>(undefined)
  const source = derive(() => {
    changes.version.get()
    return { hidden: showHidden.get() }
  })
  return dynamicChild(source, ({ hidden }) => {
    const groups = ctx.projects.groups({ hidden })
    return settingsSection(
      { title: heading(groups), action: [hiddenToggle(ctx, showHidden), addButton(ctx)] },
      ...(groups.length ? groups.map(group => groupRow(ctx, menu, group, picking)) : [emptyState({ surface: 'group', text: 'No projects yet' })]),
    )
  })
}
