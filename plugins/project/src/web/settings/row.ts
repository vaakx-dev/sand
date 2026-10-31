import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { div, type Sig } from '@vaakx-dev/vrui'
import { remoteKey } from '../../projects/remote'
import type { ProjectsContext } from '../context'
import { iconEntries, iconSheet, type Picking } from './icon'
import { locationLine } from './location'
import { byRecent } from './places'
import { groupSpec } from './specs'

const menuButton = ({ icon, iconButton }: Kit, menu: ContextMenu, spec: () => ReturnType<typeof groupSpec>) =>
  iconButton(
    {
      surface: 'group',
      title: 'Project actions',
      'aria-label': 'Project actions',
      'aria-haspopup': 'menu',
      onClick: (event: MouseEvent) => {
        const from = event.currentTarget
        if (!(from instanceof HTMLElement)) return
        const box = from.getBoundingClientRect()
        const touch = event instanceof PointerEvent && event.pointerType === 'touch'
        menu.open({ x: box.left, y: box.bottom, touch, from, ...spec() })
      },
    },
    icon('more', 'md'),
  )

const details = (ctx: ProjectsContext, menu: ContextMenu, group: ProjectGroup) =>
  div(
    { class: 'flex min-w-0 flex-col' },
    group.remote ? ctx.kit.metaLine(remoteKey(group.remote) || group.remote) : null,
    ...byRecent(group.locations).map(entry => locationLine(ctx, menu, entry)),
  )

export const groupRow = (ctx: ProjectsContext, menu: ContextMenu, group: ProjectGroup, picking: Sig<Picking>) => {
  const { badge, projectIcon, settingsRow } = ctx.kit
  const spec = () => groupSpec(ctx, group, iconEntries(ctx, group, picking))
  return settingsRow(
    {
      ...menu.target(spec),
      lead: projectIcon(group.name, ctx.projects.groupIcon(group)),
      title: group.name,
      detail: details(ctx, menu, group),
    },
    group.hidden ? badge('neutral', 'Hidden') : null,
    menuButton(ctx.kit, menu, spec),
    iconSheet(ctx, group, picking),
  )
}
