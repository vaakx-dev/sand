import { plural } from '@sand/kit'
import type { ProjectGroup } from '@sand/protocol'
import { ago, div, iconButton, icon, projectIcon, show, span, type Sig } from '@sand/dom'
import { locationLine } from './location'
import { rowMenu } from './menu'
import { byRecent } from './places'
import type { ProjectsContext } from './types'

const groupIcon = (ctx: ProjectsContext, group: ProjectGroup) => {
  const url = group.locations.map(entry => ctx.projects.icon(entry.path, entry.device)).find(Boolean)
  return projectIcon(group.name, url)
}

const summary = (group: ProjectGroup) => {
  const age = ago(group.updated)
  const when = age === 'now' ? 'just now' : age && `${age} ago`
  return [plural(group.threads, 'thread'), when, group.hidden && 'hidden'].filter(Boolean).join(' · ')
}

const menuButton = (group: ProjectGroup, open: Sig<string | undefined>) =>
  iconButton(
    {
      size: 'sm',
      title: 'Project actions',
      'aria-label': 'Project actions',
      'aria-haspopup': 'menu',
      active: open.map(id => id === group.id),
      onClick: () => open.set(open.get() === group.id ? undefined : group.id),
    },
    icon('more', 16),
  )

export const groupRow = (ctx: ProjectsContext, group: ProjectGroup, open: Sig<string | undefined>) => {
  const locations = byRecent(group.locations)
  const primary = locations[0]
  const multiple = locations.length > 1
  return div(
    { class: 'flex items-start gap-3 bg-neutral-900 px-4 py-3 first:rounded-t-xl last:rounded-b-xl' },
    div(
      { class: ['flex min-w-0 flex-1 flex-col gap-1.5', group.hidden ? 'opacity-60' : ''] },
      div(
        { class: 'flex min-w-0 items-center gap-2' },
        groupIcon(ctx, group),
        span({ class: 'min-w-0 truncate text-sm text-neutral-100' }, group.name),
        span({ class: 'shrink-0 text-xs text-neutral-500' }, summary(group)),
      ),
      ...locations.map(entry => locationLine(ctx, entry, multiple ? primary : undefined)),
    ),
    div(
      { class: 'relative shrink-0' },
      menuButton(group, open),
      show(
        open.map(id => id === group.id),
        () => rowMenu(ctx, group, () => open.set(undefined)),
      ),
    ),
  )
}
