import type { ContextMenu } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import type { ProjectGroup } from '@sand/web-client/contract'
import type { Pulse } from '@sand/reactive'
import { type Derive, dynamicChild, sig, type Sig } from '@vaakx-dev/vrui'
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

const emptyRows = (ctx: ProjectsContext) => (ctx.projects.known() ? ctx.kit.emptyState({ text: 'No projects yet. Add a project to start threads in its folder.' }) : null)

const rowKey = (ctx: ProjectsContext, group: ProjectGroup) =>
  JSON.stringify([group, ctx.projects.shown({ project: group.id }), group.locations.map(entry => [ctx.pcs.online(entry.device), ctx.pcs.name(entry.device)]), ctx.pcs.list().length > 1])

const groupRows = (ctx: ProjectsContext, menu: ContextMenu, picking: Sig<Picking>, groups: Derive<ProjectGroup[]>) =>
  ctx.kit.rowList(groups, group => rowKey(ctx, group), group => groupRow(ctx, menu, group.get(), picking))

const activeSection = (ctx: ProjectsContext, menu: ContextMenu, picking: Sig<Picking>, groups: Derive<ProjectGroup[]>) =>
  ctx.kit.settingsSection(
    { title: () => heading(groups.get()), action: addButton(ctx) },
    groupRows(ctx, menu, picking, groups),
    dynamicChild(
      groups.map(list => list.length === 0),
      empty => (empty ? emptyRows(ctx) : null),
    ),
  )

const archivedSection = (ctx: ProjectsContext, menu: ContextMenu, picking: Sig<Picking>, groups: Derive<ProjectGroup[]>) =>
  dynamicChild(
    groups.map(list => list.length > 0),
    any => (any ? ctx.kit.settingsSection({ title: 'Archived' }, groupRows(ctx, menu, picking, groups)) : null),
  )

export const groupsSections = (ctx: ProjectsContext, menu: ContextMenu, changes: Pulse) => {
  const picking = sig<Picking>(undefined)
  iconSheet(ctx, changes, picking)
  return [activeSection(ctx, menu, picking, changes.read(() => ctx.projects.groups())), archivedSection(ctx, menu, picking, changes.read(() => ctx.projects.archived()))]
}
