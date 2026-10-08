import { relationLabel } from '@sand/kit'
import type { ProjectEntry, SyncRelation } from '@sand/protocol'
import { badge, div, dot, icon, span, type Tone } from '@sand/dom'
import { isOnline, machineName, shorten } from './places'
import type { ProjectsContext } from './types'

const tones: Record<SyncRelation, Tone> = {
  current: 'success',
  ahead: 'accent',
  behind: 'warning',
  both: 'danger',
  unlinked: 'neutral',
}

const relationTag = (ctx: ProjectsContext, entry: ProjectEntry, primary: ProjectEntry) => {
  const relation = ctx.sync?.relation(entry, primary)
  return relation ? badge(tones[relation], relationLabel(relation, machineName(ctx, primary.device))) : null
}

export const locationLine = (ctx: ProjectsContext, entry: ProjectEntry, primary?: ProjectEntry) => {
  const online = isOnline(ctx, entry.device)
  const dimmed = !online || entry.missing
  return div(
    { class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs' },
    div(
      { class: ['flex min-w-0 items-center gap-2', dimmed ? 'opacity-50' : ''] },
      dot(online ? 'success' : 'neutral'),
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('monitor', 13)),
      span({ class: 'shrink-0 text-neutral-300' }, machineName(ctx, entry.device)),
      span({ class: 'min-w-0 truncate text-neutral-500', title: entry.path }, shorten(ctx, entry.path, entry.device)),
      entry.missing ? span({ class: 'shrink-0 text-warning-400' }, 'missing') : null,
    ),
    primary && primary !== entry ? relationTag(ctx, entry, primary) : null,
  )
}
