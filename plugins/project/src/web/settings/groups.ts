import type { ContextMenu } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import type { ProjectGroup } from '@sand/web-client/contract'
import type { Pulse } from '@sand/reactive'
import { dynamicChild, sig, type Sig } from '@vaakx-dev/vrui'
import { projectAdd } from '../../contract'
import type { ProjectsContext } from '../context'
import { iconSheet, type Picking } from './icon'
import { groupRow } from './row'

const heading = (groups: ProjectGroup[]) => {
  const pcs = new Set(groups.flatMap(group => group.locations.map(entry => entry.device))).size
  return groups.length ? `${plural(groups.length, 'project')} on ${plural(pcs, 'PC')}` : 'Your projects'
}

const addButton = (ctx: ProjectsContext) => {
  const { icon, quietButton } = ctx.kit
  const adder = ctx.get(projectAdd)
  return adder ? quietButton({ size: 'sm', 'aria-label': 'Add a project', onClick: () => adder.open({ added: () => {} }) }, icon('plus', 'sm'), 'Add') : null
}

const emptyRows = (ctx: ProjectsContext) => (ctx.projects.known() ? [ctx.kit.emptyState({ text: 'No projects yet. Add a project to start threads in its folder.' })] : [])

const activeSection = (ctx: ProjectsContext, menu: ContextMenu, picking: Sig<Picking>, groups: ProjectGroup[]) =>
  ctx.kit.settingsSection(
    { title: heading(groups), action: addButton(ctx) },
    ...(groups.length ? groups.map(group => groupRow(ctx, menu, group, picking)) : emptyRows(ctx)),
  )

const archivedSection = (ctx: ProjectsContext, menu: ContextMenu, picking: Sig<Picking>, groups: ProjectGroup[]) =>
  groups.length ? ctx.kit.settingsSection({ title: 'Archived' }, ...groups.map(group => groupRow(ctx, menu, group, picking))) : null

export const groupsSections = (ctx: ProjectsContext, menu: ContextMenu, changes: Pulse) => {
  const picking = sig<Picking>(undefined)
  iconSheet(ctx, changes, picking)
  return [
    dynamicChild(changes.read(() => ctx.projects.groups()), groups => activeSection(ctx, menu, picking, groups)),
    dynamicChild(changes.read(() => ctx.projects.archived()), groups => archivedSection(ctx, menu, picking, groups)),
  ]
}
