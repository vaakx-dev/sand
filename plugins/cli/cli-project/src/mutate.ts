import type { Project, ProjectList, ProjectPatch } from '@sand/host-projects/contract'
import { resolve } from 'node:path'
import { usage } from './usage'
import type { ProjectFlags } from './flags'
import { findGroup } from './find'
import { describeGroup, loadGroups, locationOn, noteOffline } from './groups'
import type { Pcs } from './pcs'

const patchProject = async (pcs: Pcs, value: string | undefined, patch: ProjectPatch, done: (name: string) => string) => {
  if (!value) throw new Error(usage)
  const { groups } = await loadGroups(pcs)
  const group = findGroup(groups, value)
  await pcs.call({ type: 'projects.update', project: group.id, patch })
  console.log(done(group.name))
}

export const addProject = async (pcs: Pcs, [path]: string[]) => {
  if (!path) throw new Error(usage)
  const project = await pcs.call<Project>({ type: 'projects.add', path: resolve(path) })
  console.log(`saved ${project.name}`)
}

export const removeProject = async (pcs: Pcs, [value]: string[], { on }: ProjectFlags) => {
  if (!value) throw new Error(usage)
  const { groups, offline, device } = await loadGroups(pcs)
  const group = findGroup(groups, value)
  if (!on) {
    noteOffline(offline)
    console.log(`deleting ${describeGroup(group)} on every PC; the folders stay on disk`)
    await pcs.call({ type: 'projects.remove', project: group.id })
    return console.log(`deleted ${group.name}`)
  }
  const pc = pcs.named(on)
  if (!locationOn(group, pc)) throw new Error(`${group.name} has no copy on ${pc.name}`)
  await pcs.call({ type: 'projects.remove', project: group.id, device: pc.device ?? device })
  console.log(`forgot the copy of ${group.name} on ${pc.name}; the folder stays on disk`)
}

export const renameProject = async (pcs: Pcs, [value, ...words]: string[]) => {
  const name = words.join(' ').trim()
  if (!name) throw new Error(usage)
  await patchProject(pcs, value, { name }, old => `renamed ${old} to ${name}`)
}

export const hideProject = (pcs: Pcs, [value]: string[]) => patchProject(pcs, value, { hidden: true }, name => `hid ${name}`)

export const showProject = (pcs: Pcs, [value]: string[]) => patchProject(pcs, value, { hidden: false }, name => `showing ${name}`)

export const projectRoot = async (pcs: Pcs, [path]: string[], { on }: ProjectFlags) => {
  const pc = on ? pcs.named(on) : pcs.local
  if (!path) return console.log((await pcs.call<ProjectList>({ type: 'projects.list' }, pc.device)).root)
  const root = pc.device || path.startsWith('~') ? path : resolve(path)
  const list = await pcs.call<ProjectList>({ type: 'projects.root', root }, pc.device)
  console.log(`root is now ${list.root}`)
}
