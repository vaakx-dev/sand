import { palette } from '@sand/palette/contract'
import type { ContextMenu } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import type { ProjectGroup } from '@sand/web-client/contract'
import type { Pulse } from '@sand/web-client/reactive'
import { derive, div, dynamicChild, sig, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { sourcesPage } from '../new/sources'
import type { Picking } from './icon'
import { groupRow } from './row'

const heading = (groups: ProjectGroup[]) => {
  const pcs = new Set(groups.flatMap(group => group.locations.map(entry => entry.device))).size
  return groups.length ? `${plural(groups.length, 'project')} on ${plural(pcs, 'PC')}` : 'Projects'
}

const addButton = (ctx: ProjectsContext) => {
  const { icon, secondaryAction } = ctx.kit
  const found = ctx.get(palette)
  return found ? secondaryAction({ size: 'sm', onClick: () => found.open(sourcesPage(ctx)) }, icon('plus', 14), 'Add a project') : null
}

const hiddenToggle = (ctx: ProjectsContext, showHidden: Sig<boolean>) => {
  const { quietButton } = ctx.kit
  return showHidden.get() || ctx.projects.groups({ hidden: true }).some(group => group.hidden)
    ? quietButton({ size: 'sm', active: showHidden.get(), onClick: showHidden.toggle() }, 'Show hidden')
    : null
}

export const groupsSection = (ctx: ProjectsContext, menu: ContextMenu, changes: Pulse) => {
  const { hintRow, settingsSection } = ctx.kit
  const showHidden = sig(false)
  const open = sig<string | undefined>(undefined)
  const picking = sig<Picking>(undefined)
  const source = derive(() => {
    changes.version.get()
    return { hidden: showHidden.get() }
  })
  return dynamicChild(source, ({ hidden }) => {
    const groups = ctx.projects.groups({ hidden })
    return settingsSection(
      { title: heading(groups), action: div({ class: 'flex items-center gap-2' }, hiddenToggle(ctx, showHidden), addButton(ctx)) },
      ...(groups.length ? groups.map(group => groupRow(ctx, menu, group, open, picking)) : [hintRow('No projects yet')]),
    )
  })
}
