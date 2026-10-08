import type { Machine, ProjectEntry, ProjectGroup, SyncRelation } from '@sand/protocol'
import type { Tone } from '@sand/dom'
import { relationLabel } from '@sand/kit'
import { deviceOf, locationOn, refOf, type PickerContext } from './target'

export interface Neighbour {
  entry: ProjectEntry
  machine: Machine
  relation: SyncRelation
}

export interface RowStatus {
  tone: Tone
  text: string
  muted?: boolean
}

const priority: SyncRelation[] = ['both', 'behind', 'ahead', 'unlinked', 'current']

const tones: Record<SyncRelation, Tone> = {
  current: 'success',
  ahead: 'success',
  behind: 'warning',
  both: 'warning',
  unlinked: 'neutral',
}

export const neighbours = (ctx: PickerContext, group: ProjectGroup, location: ProjectEntry): Neighbour[] =>
  group.locations.flatMap(entry => {
    if (entry.device === location.device) return []
    const machine = ctx.machines.get(entry.device)
    const relation = machine?.online ? ctx.sync?.relation(refOf(location), refOf(entry)) : undefined
    return machine && relation ? [{ entry, machine, relation }] : []
  })

export const newerSource = (ctx: PickerContext, group: ProjectGroup, location: ProjectEntry) =>
  neighbours(ctx, group, location).find(neighbour => neighbour.relation === 'behind')

export const statusOf = (ctx: PickerContext, group: ProjectGroup, machine: Machine): RowStatus | undefined => {
  if (!machine.online) return { tone: 'neutral', text: 'Offline', muted: true }
  const location = locationOn(group, deviceOf(machine))
  if (!location) return { tone: 'neutral', text: 'Copy here…' }
  const found = neighbours(ctx, group, location)
  for (const relation of priority) {
    const hit = found.find(neighbour => neighbour.relation === relation)
    if (hit) return { tone: tones[relation], text: relationLabel(relation, hit.machine.name) }
  }
  return undefined
}
