import type { Project, ProjectList, ProjectPatch } from '@sand/protocol'
import { resolve } from 'node:path'
import { usage } from './usage'
import type { ProjectFlags } from './flags'
import { findGroup } from './find'
import { loadGroups, locationOn, noteOffline } from './groups'
import type { Pcs } from './pcs'

const patchAll = async (pcs: Pcs, value: string | undefined, patch: ProjectPatch, done: (name: string) => string) => {
  if (!value) throw new Error(usage)
  const { groups, offline } = await loadGroups(pcs)
  noteOffline(offline)
  const group = findGroup(groups, value)
  for (const { pc, project } of group.locations) await pcs.call({ type: 'projects.update', path: project.path, patch }, pc.device)
  console.log(done(group.name))
}

export const addProject = async (pcs: Pcs, [path]: string[]) => {
  if (!path) throw new Error(usage)
  const project = await pcs.call<Project>({ type: 'projects.add', path: resolve(path) })
  console.log(`saved ${project.name}`)
}

export const removeProject = async (pcs: Pcs, [value]: string[], { on }: ProjectFlags) => {
  if (!value) throw new Error(usage)
  const pc = on ? pcs.named(on) : pcs.local
  const { groups } = await loadGroups(pcs)
  const group = findGroup(groups, value)
  const location = locationOn(group, pc)
  if (!location) throw new Error(`${group.name} is not on ${pc.name}; pick the PC with --on`)
  await pcs.call({ type: 'projects.remove', path: location.project.path }, pc.device)
  console.log(`removed ${group.name} from ${pc.name}`)
}

export const renameProject = async (pcs: Pcs, [value, ...words]: string[]) => {
  const name = words.join(' ').trim()
  if (!name) throw new Error(usage)
  await patchAll(pcs, value, { name }, old => `renamed ${old} to ${name}`)
}

export const hideProject = (pcs: Pcs, [value]: string[]) => patchAll(pcs, value, { hidden: true }, name => `hid ${name}`)

export const showProject = (pcs: Pcs, [value]: string[]) => patchAll(pcs, value, { hidden: false }, name => `showing ${name}`)

export const projectRoot = async (pcs: Pcs, [path]: string[], { on }: ProjectFlags) => {
  const pc = on ? pcs.named(on) : pcs.local
  if (!path) return console.log((await pcs.call<ProjectList>({ type: 'projects.list' }, pc.device)).root)
  const root = pc.device || path.startsWith('~') ? path : resolve(path)
  console.log(`root is now ${await pcs.call<string>({ type: 'projects.root', root }, pc.device)}`)
}
