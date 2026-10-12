import { ago, plural, remoteKey } from '@sand/kit'
import { popupTrigger } from '@sand/kit/web'
import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { div, show, span, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { iconEntries, iconPopover, type Picking } from './icon'
import { locationLine, noCopyLine } from './location'
import { rowMenu } from './menu'
import { byRecent, withoutCopy } from './places'
import { groupSpec } from './specs'

const summary = (group: ProjectGroup) => {
  const age = ago(group.updated)
  const when = age === 'now' ? 'just now' : age && `${age} ago`
  return [plural(group.threads, 'thread'), when, group.hidden && 'hidden'].filter(Boolean).join(' · ')
}

const remoteLine = ({ icon, statusLine }: Kit, remote?: string) =>
  remote ? statusLine({ mark: span({ class: 'inline-flex shrink-0' }, icon('folder-git', 12)), text: remoteKey(remote) || remote, title: remote }) : null

const noCopyLines = (ctx: ProjectsContext, group: ProjectGroup) => {
  const flows = ctx.syncFlows
  if (!flows) return []
  return withoutCopy(ctx, group)
    .filter(machine => machine.online)
    .map(machine => noCopyLine(ctx.kit, flows, group, machine))
}

const menuButton = ({ icon, iconButton }: Kit, group: ProjectGroup, open: Sig<string | undefined>, opened: Derive<boolean>) =>
  iconButton(
    {
      size: 'sm',
      title: 'Project actions',
      'aria-label': 'Project actions',
      ...popupTrigger(opened),
      active: opened,
      onClick: () => open.set(opened.get() ? undefined : group.id),
    },
    icon('more', 14),
  )

export const groupRow = (ctx: ProjectsContext, menu: ContextMenu, group: ProjectGroup, open: Sig<string | undefined>, picking: Sig<Picking>) => {
  const { projectIcon, sectionRow } = ctx.kit
  const locations = byRecent(group.locations)
  const primary = locations.length > 1 ? locations[0] : undefined
  const opened = open.map(id => id === group.id)
  return sectionRow(
    menu.target(() => groupSpec(ctx, group)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      div(
        { class: 'flex min-w-0 items-center gap-2' },
        projectIcon(group.name, ctx.projects.groupIcon(group)),
        span({ class: 'min-w-0 truncate text-sm font-medium text-neutral-100' }, group.name),
        span({ class: 'shrink-0 text-xs text-neutral-500' }, summary(group)),
      ),
      remoteLine(ctx.kit, group.remote),
      ...locations.map(entry => locationLine(ctx, menu, entry, primary)),
      ...noCopyLines(ctx, group),
    ),
    div(
      { class: 'relative shrink-0' },
      menuButton(ctx.kit, group, open, opened),
      show(opened, () => rowMenu(ctx, group, () => open.set(undefined), iconEntries(ctx, group, picking))),
      iconPopover(ctx, group, picking),
    ),
  )
}
