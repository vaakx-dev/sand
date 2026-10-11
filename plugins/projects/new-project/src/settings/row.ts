import { plural, remoteKey } from '@sand/kit'
import type { ProjectGroup } from '@sand/web-client/contract'
import { ago, div, iconButton, icon, popupTrigger, sectionRow, show, span, statusLine, type ContextMenu, type Derive, type Sig } from '@sand/dom'
import type { ProjectsContext } from '../context'
import { iconChoice, type Picking } from './icon'
import { locationLine, noCopyLine } from './location'
import { rowMenu } from './menu'
import { byRecent, withoutCopy } from './places'
import { groupSpec } from './specs'

const summary = (group: ProjectGroup) => {
  const age = ago(group.updated)
  const when = age === 'now' ? 'just now' : age && `${age} ago`
  return [plural(group.threads, 'thread'), when, group.hidden && 'hidden'].filter(Boolean).join(' · ')
}

const remoteLine = (remote?: string) =>
  remote ? statusLine({ mark: span({ class: 'inline-flex shrink-0' }, icon('folder-git', 13)), text: remoteKey(remote) || remote, title: remote }) : null

const noCopyLines = (ctx: ProjectsContext, group: ProjectGroup) => {
  const flows = ctx.syncFlows
  if (!flows) return []
  return withoutCopy(ctx, group)
    .filter(machine => machine.online)
    .map(machine => noCopyLine(flows, group, machine))
}

const menuButton = (group: ProjectGroup, open: Sig<string | undefined>, opened: Derive<boolean>) =>
  iconButton(
    {
      size: 'sm',
      title: 'Project actions',
      'aria-label': 'Project actions',
      ...popupTrigger(opened),
      active: opened,
      onClick: () => open.set(opened.get() ? undefined : group.id),
    },
    icon('more', 16),
  )

export const groupRow = (ctx: ProjectsContext, menu: ContextMenu, group: ProjectGroup, open: Sig<string | undefined>, picking: Sig<Picking>) => {
  const locations = byRecent(group.locations)
  const primary = locations.length > 1 ? locations[0] : undefined
  const opened = open.map(id => id === group.id)
  const projectIcon = iconChoice(ctx, group, picking)
  return sectionRow(
    menu.target(() => groupSpec(ctx, group)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      div(
        { class: 'flex min-w-0 items-center gap-2' },
        projectIcon.toggle,
        span({ class: 'min-w-0 truncate text-sm text-neutral-100' }, group.name),
        span({ class: 'shrink-0 text-xs text-neutral-500' }, summary(group)),
      ),
      projectIcon.picker,
      remoteLine(group.remote),
      ...locations.map(entry => locationLine(ctx, menu, entry, primary)),
      ...noCopyLines(ctx, group),
    ),
    div(
      { class: 'relative shrink-0' },
      menuButton(group, open, opened),
      show(opened, () => rowMenu(ctx, group, () => open.set(undefined))),
    ),
  )
}
