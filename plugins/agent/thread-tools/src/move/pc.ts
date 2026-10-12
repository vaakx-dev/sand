import type { ProjectRef } from '@sand/host-projects/contract'
import { liveProjects } from '@sand/kit'
import { longCall } from '@sand/kit/host'
import type { FoundThread, Pc, Pcs } from '@sand/pc-link/contract'
import { foldersFor, moveThread } from '@sand/sessions-ui/move'
import type { SyncState } from '@sand/sync/contract'
import { relationOf, sendProject, type SyncWire } from '@sand/sync/flows'

export interface PcMove {
  to: Pc
  cwd?: string
  sendChanges?: boolean
}

interface Shared {
  name: string
  from: ProjectRef
  to: ProjectRef
}

const planOf = async (pcs: Pcs, { pc, thread }: FoundThread, { to, cwd }: PcMove) => {
  if (to.id === pc.id) throw new Error(`The thread already runs on ${to.name}`)
  if (cwd) return { folders: [cwd] }
  const [source, target] = await Promise.all([pcs.projects(pc), pcs.projects(to)])
  const project = liveProjects([source, target]).find(candidate => candidate.id === thread.project)
  if (!project) return { folders: [thread.cwd] }
  const there = project.copies[to.id]
  if (!there) throw new Error(`${project.name} has no copy on ${to.name}. Put one there with project_copy, or give cwd`)
  const here = project.copies[pc.id]
  const shared = here && { name: project.name, from: { path: here.path, device: pc.id }, to: { path: there.path, device: to.id } }
  return { folders: foldersFor(thread.cwd, there.path, target.sep, here?.path), project: project.id, shared }
}

const slowWire = (pcs: Pcs): SyncWire => ({ call: (request, device) => pcs.call(request, device, longCall), fetch: pcs.fetch })

const wantsSend = async (wire: SyncWire, found: FoundThread, move: PcMove, shared: Shared) => {
  const [source, target] = await Promise.all([
    wire.call<SyncState>({ type: 'sync.state', path: shared.from.path }, shared.from.device),
    wire.call<SyncState>({ type: 'sync.state', path: shared.to.path }, shared.to.device),
  ])
  const relation = relationOf(source, target)
  if (relation !== 'ahead' && relation !== 'both') return false
  if (move.sendChanges === undefined)
    throw new Error(`${found.pc.name} has changes to ${shared.name} that ${move.to.name} doesn't have. Call again with send_changes true to send them first, or false to move without them`)
  return move.sendChanges
}

export const checkPcMove = async (pcs: Pcs, found: FoundThread, move: PcMove) => {
  const { shared } = await planOf(pcs, found, move)
  if (shared) await wantsSend(slowWire(pcs), found, move, shared)
}

const send = async (wire: SyncWire, move: PcMove, shared: Shared) => {
  const applied = await sendProject(wire, shared.from, shared.to)
  if (applied.result === 'conflicts')
    throw new Error(`Sending the changes left merge conflicts on ${move.to.name} in ${applied.conflicts.join(', ')}; the thread was not moved. Resolve them there first`)
}

export const moveToPc = async (pcs: Pcs, found: FoundThread, move: PcMove) => {
  const { folders, project, shared } = await planOf(pcs, found, move)
  const wire = slowWire(pcs)
  if (shared && (await wantsSend(wire, found, move, shared))) await send(wire, move, shared)
  const { thread } = found
  const moved = await moveThread(wire.call, { thread: thread.id, named: thread.named, source: found.pc, target: move.to, folders, project })
  pcs.remember(moved.session, move.to)
  const mark = moved.linked ? '' : ` The original on ${found.pc.name} could not be marked with a link to it.`
  return `Moved "${thread.title ?? thread.id}" to ${move.to.name} as thread ${moved.session}. The original stays on ${found.pc.name} with a link to the new one.${mark}`
}
