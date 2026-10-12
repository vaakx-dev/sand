import type { FolderListing, Project } from '@sand/host-projects/contract'
import { bytes, folderName, plural, projectCopy } from '@sand/kit'
import { longCall } from '@sand/kit/host'
import type { Pc, Pcs } from '@sand/pc-link/contract'
import type { SyncInspect } from '@sand/sync/contract'
import { copyProject, type SyncWire } from '@sand/sync/flows'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { folderOn } from '../folder'

const input = z.object({
  project: z.string().describe('Project name or id'),
  to: z.string().describe('PC name or id to put it on'),
  from: z.string().optional().describe('PC name or id to copy from. Defaults to this PC, or the only online PC with a copy'),
})

type Input = z.output<typeof input>

const sourceOf = async (pcs: Pcs, project: Project, from: string | undefined) => {
  if (from) return pcs.find(from)
  const here = await pcs.find()
  if (project.copies[here.id]) return here
  const holders = (await pcs.list()).filter(pc => pc.online && project.copies[pc.id])
  const [only, ...others] = holders
  if (only && !others.length) return only
  throw new Error(holders.length ? `${project.name} is on ${holders.map(pc => pc.name).join(' and ')}; say which with from` : `No online PC has a copy of ${project.name}`)
}

const freeFolder = async (pcs: Pcs, target: Pc, name: string, project: string) => {
  const { root, path } = await folderOn(pcs, target, name)
  const listing = await pcs.call<FolderListing>({ type: 'fs.browse', path: root }, target.id)
  if (listing.folders.includes(name))
    throw new Error(`${path} already exists on ${target.name}; nothing was copied. To use that folder as the copy, call project_add with path ${path}, pc ${target.name} and project ${project}`)
  return path
}

const describe = (inspected: SyncInspect) => {
  const history = inspected.git ? ` and git history (${bytes(inspected.historyBytes)})` : ''
  return [
    `${plural(inspected.files, 'file')} (${bytes(inspected.bytes)})${history}.`,
    ...(inspected.skipped.length ? [`Skipped ${inspected.skipped.map(item => item.name).join(', ')}.`] : []),
    ...(inspected.secrets.length ? [`Left out what looks like secrets: ${inspected.secrets.join(', ')}.`] : []),
    ...(inspected.setup ? [`Its setup command was not run: ${inspected.setup}`] : []),
  ]
}

const copyTo = async (pcs: Pcs, { project, to, from }: Input) => {
  const found = await pcs.project(project)
  const target = await pcs.find(to)
  const held = found.copies[target.id]
  if (held) throw new Error(`${found.name} is already on ${target.name}, at ${held.path}`)
  const source = await sourceOf(pcs, found, from)
  const origin = projectCopy(found, source)
  const wire: SyncWire = { call: (request, device) => pcs.call(request, device, longCall), fetch: pcs.fetch }
  const inspected = await wire.call<SyncInspect>({ type: 'sync.inspect', path: origin.path }, source.id)
  const path = await freeFolder(pcs, target, folderName(origin.path), found.name)
  await copyProject(wire, origin, { path, device: target.id }, { project: found.id })
  return { found, source, origin, target, path, report: describe(inspected) }
}

export const copyTool = (pcs: Pcs): Tool<typeof input> => ({
  name: 'project_copy',
  group: 'projects',
  description: "Put a copy of a project on another PC: sends its files and git history into that PC's project folder and saves it as a copy of the same project.",
  input,
  async run(request) {
    const { found, source, target, path, report } = await copyTo(pcs, request)
    return [`Copied ${found.name} from ${source.name} to ${target.name}, at ${path}:`, ...report].join('\n')
  },
})

export const moveTool = (pcs: Pcs): Tool<typeof input> => ({
  name: 'project_move',
  group: 'projects',
  description: 'Move a project to another PC: copies it like project_copy, then removes the copy it came from. The old folder stays on disk.',
  input,
  async run(request) {
    const { found, source, origin, target, path, report } = await copyTo(pcs, request)
    await pcs.call({ type: 'projects.remove', project: found.id, device: source.id }, (await pcs.find()).id)
    return [`Moved ${found.name} from ${source.name} to ${target.name}, at ${path}:`, ...report, `Removed the copy on ${source.name}; its folder stays on disk at ${origin.path}.`].join('\n')
  },
})
