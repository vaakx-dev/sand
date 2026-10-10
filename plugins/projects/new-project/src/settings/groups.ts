import { plural } from '@sand/kit'
import type { ProjectGroup } from '@sand/web-client/contract'
import { derive, div, dynamicChild, icon, quietButton, secondaryAction, settingsRow, sig, type ContextMenu, type Pulse, type Sig } from '@sand/dom'
import { sourcesPage } from '../flow/sources'
import { projectList } from './list'
import { refreshStates } from './refresh'
import { groupRow } from './row'
import type { ProjectsContext } from './types'

const heading = (groups: ProjectGroup[]) => {
  const pcs = new Set(groups.flatMap(group => group.locations.map(entry => entry.device ?? ''))).size
  return groups.length ? `${plural(groups.length, 'project')} on ${plural(pcs, 'PC')}` : 'Projects'
}

const addButton = (ctx: ProjectsContext) => {
  const palette = ctx.palette
  return palette ? secondaryAction({ size: 'sm', onClick: () => palette.open(sourcesPage(ctx)) }, icon('plus', 12), 'Add project') : null
}

const hiddenToggle = (ctx: ProjectsContext, showHidden: Sig<boolean>) =>
  showHidden.get() || ctx.projects.groups({ hidden: true }).some(group => group.hidden)
    ? quietButton({ size: 'sm', active: showHidden.get(), onClick: () => showHidden.set(!showHidden.get()) }, 'Show hidden')
    : null

export const groupsSection = (ctx: ProjectsContext, menu: ContextMenu, changes: Pulse, live: Sig<number>) => {
  const showHidden = sig(false)
  const open = sig<string | undefined>(undefined)
  const refreshed = new Set<string>()
  const source = derive(() => {
    changes.version.get()
    live.get()
    return { hidden: showHidden.get() }
  })
  return dynamicChild(source, ({ hidden }) => {
    const groups = ctx.projects.groups({ hidden })
    refreshStates(ctx, groups, refreshed)
    return projectList(
      { title: heading(groups), action: div({ class: 'flex items-center gap-2' }, hiddenToggle(ctx, showHidden), addButton(ctx)) },
      ...(groups.length ? groups.map(group => groupRow(ctx, menu, group, open)) : [settingsRow('No saved projects')]),
    )
  })
}
