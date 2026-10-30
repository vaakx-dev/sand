import type { ContextMenu } from '@sand/ui-kit/contract'
import type { ProjectEntry } from '@sand/web-client/contract'
import { div, span, stopThen } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { shorten } from './places'
import { copySpec } from './specs'

const copyMenu = (ctx: ProjectsContext, menu: ContextMenu, entry: ProjectEntry) => {
  const props = menu.target(() => copySpec(ctx, entry))
  return { ...props, onPointerDown: stopThen(props.onPointerDown), onContextMenu: stopThen(props.onContextMenu) }
}

const pcLabel = (ctx: ProjectsContext, entry: ProjectEntry, online: boolean) =>
  ctx.pcs.list().length > 1 ? [ctx.kit.dot(online ? 'success' : 'neutral'), span({ class: 'shrink-0' }, ctx.pcs.name(entry.device))] : []

export const locationLine = (ctx: ProjectsContext, menu: ContextMenu, entry: ProjectEntry) => {
  const online = ctx.pcs.online(entry.device)
  return div(
    { class: ['flex min-w-0 items-center gap-2', !online || entry.missing ? 'text-neutral-500' : ''], ...copyMenu(ctx, menu, entry) },
    ...pcLabel(ctx, entry, online),
    span({ class: 'min-w-0 truncate', title: entry.path }, shorten(ctx, entry.path, entry.device)),
    entry.missing ? span({ class: 'shrink-0 text-warning-400' }, 'Folder missing') : null,
  )
}
