import { relationLabel } from '@sand/kit'
import type { SyncRelation } from '@sand/sync/contract'
import type { Machine, ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { SyncFlows } from '../contract'
import { badge, div, dot, icon, quietButton, span, type Child, type ContextMenu, type MenuSpec, type Tone } from '@sand/dom'
import { copySpec } from './context'
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

const lineRow = (props: object, ...children: Child[]) => div({ class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs', ...props }, ...children)

const ownMenu = (menu: ContextMenu, spec: () => MenuSpec) => {
  const props = menu.target(spec)
  return {
    ...props,
    onPointerDown: (event: PointerEvent) => {
      event.stopPropagation()
      props.onPointerDown(event)
    },
    onContextMenu: (event: MouseEvent) => {
      event.stopPropagation()
      props.onContextMenu(event)
    },
  }
}

export const locationLine = (ctx: ProjectsContext, menu: ContextMenu, entry: ProjectEntry, primary?: ProjectEntry) => {
  const online = isOnline(ctx, entry.device)
  const dimmed = !online || entry.missing
  return lineRow(
    ownMenu(menu, () => copySpec(ctx, entry)),
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
    {},
    div(
      { class: 'flex min-w-0 items-center gap-2' },
      dot('neutral'),
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('monitor', 13)),
      span({ class: 'min-w-0 truncate text-neutral-500' }, `No copy on ${machine.name}`),
    ),
    quietButton({ size: 'sm', onClick: () => flows.copy(group, machineKey(machine)) }, icon('down', 12), 'Get a copy'),
  )
