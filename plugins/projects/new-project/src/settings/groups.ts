import { plural } from '@sand/kit'
import type { Pulse } from '@sand/kit/web'
import type { ContextMenu } from '@sand/ui-kit/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { derive, div, dynamicChild, sig, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { sourcesPage } from '../flow/sources'
import type { Picking } from './icon'
import { groupRow } from './row'

const heading = (groups: ProjectGroup[]) => {
  const pcs = new Set(groups.flatMap(group => group.locations.map(entry => entry.device))).size
  return groups.length ? `${plural(groups.length, 'project')} on ${plural(pcs, 'PC')}` : 'Projects'
}

const refreshStates = (ctx: ProjectsContext, groups: ProjectGroup[], done: Set<string>) => {
  const sync = ctx.sync
  if (!sync) return
  const entries = groups.filter(group => group.locations.length > 1).flatMap(group => group.locations)
  for (const entry of entries) {
    const key = `${entry.device}\0${entry.path}`
    if (done.has(key) || entry.missing || !ctx.machines.online(entry.device)) continue
    done.add(key)
    sync.refresh(entry).catch(() => undefined)
  }
}

const addButton = (ctx: ProjectsContext) => {
  const { icon, secondaryAction } = ctx.kit
  const palette = ctx.palette
  return palette ? secondaryAction({ size: 'sm', onClick: () => palette.open(sourcesPage(ctx)) }, icon('plus', 14), 'Add a project') : null
}

const hiddenToggle = (ctx: ProjectsContext, showHidden: Sig<boolean>) => {
  const { quietButton } = ctx.kit
  return showHidden.get() || ctx.projects.groups({ hidden: true }).some(group => group.hidden)
    ? quietButton({ size: 'sm', active: showHidden.get(), onClick: showHidden.toggle() }, 'Show hidden')
    : null
}

export const groupsSection = (ctx: ProjectsContext, menu: ContextMenu, changes: Pulse, live: Sig<number>) => {
  const { hintRow, settingsSection } = ctx.kit
  const showHidden = sig(false)
  const open = sig<string | undefined>(undefined)
  const picking = sig<Picking>(undefined)
  const refreshed = new Set<string>()
  const source = derive(() => {
    changes.version.get()
    live.get()
    return { hidden: showHidden.get() }
  })
  return dynamicChild(source, ({ hidden }) => {
    const groups = ctx.projects.groups({ hidden })
    refreshStates(ctx, groups, refreshed)
    return settingsSection(
      { title: heading(groups), action: div({ class: 'flex items-center gap-2' }, hiddenToggle(ctx, showHidden), addButton(ctx)) },
      ...(groups.length ? groups.map(group => groupRow(ctx, menu, group, open, picking)) : [hintRow('No projects yet')]),
    )
  })
}
