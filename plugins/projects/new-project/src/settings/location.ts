import { relationLabel } from '@sand/kit'
import type { Machine, ProjectEntry, ProjectGroup, SyncFlows, SyncRelation } from '@sand/protocol'
import { badge, div, dot, icon, quietButton, span, type Child, type Tone } from '@sand/dom'
import { isOnline, machineKey, machineName, shorten } from './places'
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

const lineRow = (...children: Child[]) => div({ class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs' }, ...children)

export const locationLine = (ctx: ProjectsContext, entry: ProjectEntry, primary?: ProjectEntry) => {
  const online = isOnline(ctx, entry.device)
  const dimmed = !online || entry.missing
  return lineRow(
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

export const noCopyLine = (flows: SyncFlows, group: ProjectGroup, machine: Machine) =>
  lineRow(
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      dot('neutral'),
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('monitor', 13)),
      span({ class: 'min-w-0 truncate text-neutral-500' }, `No copy on ${machine.name}`),
    ),
    quietButton({ size: 'sm', onClick: () => flows.copy(group, machineKey(machine)) }, icon('down', 12), 'Get a copy'),
  )
