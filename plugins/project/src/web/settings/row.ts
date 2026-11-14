import type { ContextMenu } from '@sand/ui-kit/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { div, span, type Sig } from '@vaakx-dev/vrui'
import { remoteKey } from '../../projects/remote'
import type { ProjectsContext } from '../context'
import { iconEntries, type Picking } from './icon'
import { locationLine } from './location'
import { byRecent } from './places'
import { groupSpec } from './specs'

const details = (ctx: ProjectsContext, menu: ContextMenu, group: ProjectGroup) =>
  div(
    { class: 'flex min-w-0 flex-col' },
    group.remote ? ctx.kit.metaLine(remoteKey(group.remote) || group.remote) : null,
    ...byRecent(group.locations).map(entry => locationLine(ctx, menu, entry)),
  )

const standingMark = (ctx: ProjectsContext, group: ProjectGroup) => {
  const { icon, quietButton } = ctx.kit
  if (group.archived) return quietButton({ size: 'sm', onClick: () => void ctx.projects.archive(group, false).catch(() => {}) }, 'Unarchive')
  return group.pinned ? span({ class: 'text-neutral-400', title: 'Pinned', 'aria-label': 'Pinned' }, icon('pin', 'sm')) : null
}

export const groupRow = (ctx: ProjectsContext, menu: ContextMenu, group: ProjectGroup, picking: Sig<Picking>) => {
  const { projectIcon, settingsRow } = ctx.kit
  const spec = () => groupSpec(ctx, group, iconEntries(ctx, group, picking))
  const shown = ctx.projects.shown({ project: group.id })
  return settingsRow(
    {
      ...menu.target(spec),
      lead: projectIcon(shown.name, shown.icon),
      title: shown.name,
      detail: details(ctx, menu, group),
    },
    standingMark(ctx, group),
    menu.button(spec, { title: 'Project actions' }),
  )
}
