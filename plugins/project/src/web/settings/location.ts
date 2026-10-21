import type { ContextMenu, Kit, Tone } from '@sand/ui-kit/contract'
import type { ProjectEntry } from '@sand/web-client/contract'
import { div, span, stopThen } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import { shorten } from './places'
import { copySpec } from './specs'

export const machineMark = ({ dot, icon }: Kit, tone: Tone, size: number) => [dot(tone), span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('monitor', size))]

const copyMenu = (ctx: ProjectsContext, menu: ContextMenu, entry: ProjectEntry) => {
  const props = menu.target(() => copySpec(ctx, entry))
  return { ...props, onPointerDown: stopThen(props.onPointerDown), onContextMenu: stopThen(props.onContextMenu) }
}

export const locationLine = (ctx: ProjectsContext, menu: ContextMenu, entry: ProjectEntry) => {
  const online = ctx.machines.online(entry.device)
  return div(
    { class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs', ...copyMenu(ctx, menu, entry) },
    div(
      { class: ['flex min-w-0 items-center gap-2', !online || entry.missing ? 'opacity-50' : ''] },
      ...machineMark(ctx.kit, online ? 'success' : 'neutral', 12),
      span({ class: 'shrink-0 text-neutral-300' }, ctx.machines.name(entry.device)),
      span({ class: 'min-w-0 truncate text-neutral-500', title: entry.path }, shorten(ctx, entry.path, entry.device)),
      entry.missing ? span({ class: 'shrink-0 text-warning-400' }, 'Missing') : null,
    ),
  )
}
