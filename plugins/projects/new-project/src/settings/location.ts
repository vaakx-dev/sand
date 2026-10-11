import { relationLabel } from '@sand/sync/flows'
import type { SyncRelation } from '@sand/sync/contract'
import type { Machine, ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { SyncFlows } from '../contract'
import { badge, div, dot, icon, quietButton, span, stopThen, type Child, type ContextMenu, type Props, type Tone } from '@sand/dom'
import type { ProjectsContext } from '../context'
import { shorten } from './places'
import { copySpec } from './specs'

const tones: Record<SyncRelation, Tone> = {
  current: 'success',
  ahead: 'accent',
  behind: 'warning',
  both: 'danger',
  unlinked: 'neutral',
}

export const machineMark = (tone: Tone, size: number) => [dot(tone), span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('monitor', size))]

const line = (children: Child[], props: Props<HTMLDivElement> = {}) => div({ class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs', ...props }, ...children)

const relationTag = (ctx: ProjectsContext, entry: ProjectEntry, primary: ProjectEntry) => {
  const relation = ctx.sync?.relation(entry, primary)
  return relation ? badge(tones[relation], relationLabel(relation, ctx.machines.name(primary.device))) : null
}

const copyMenu = (ctx: ProjectsContext, menu: ContextMenu, entry: ProjectEntry) => {
  const props = menu.target(() => copySpec(ctx, entry))
  return { ...props, onPointerDown: stopThen(props.onPointerDown), onContextMenu: stopThen(props.onContextMenu) }
}

export const locationLine = (ctx: ProjectsContext, menu: ContextMenu, entry: ProjectEntry, primary?: ProjectEntry) => {
  const online = ctx.machines.online(entry.device)
  return line(
    [
      div(
        { class: ['flex min-w-0 items-center gap-2', !online || entry.missing ? 'opacity-50' : ''] },
        ...machineMark(online ? 'success' : 'neutral', 13),
        span({ class: 'shrink-0 text-neutral-300' }, ctx.machines.name(entry.device)),
        span({ class: 'min-w-0 truncate text-neutral-500', title: entry.path }, shorten(ctx, entry.path, entry.device)),
        entry.missing ? span({ class: 'shrink-0 text-warning-400' }, 'missing') : null,
      ),
      primary && primary !== entry ? relationTag(ctx, entry, primary) : null,
    ],
    copyMenu(ctx, menu, entry),
  )
}

export const noCopyLine = (flows: SyncFlows, group: ProjectGroup, machine: Machine) =>
  line([
    div({ class: 'flex min-w-0 items-center gap-2' }, ...machineMark('neutral', 13), span({ class: 'min-w-0 truncate text-neutral-500' }, `No copy on ${machine.name}`)),
    quietButton({ size: 'sm', onClick: () => flows.copy(group, machine.device) }, icon('down', 12), 'Get a copy'),
  ])
