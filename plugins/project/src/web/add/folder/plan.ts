import type { AddedProject } from '../../../contract'
import type { ProjectGroup, Projects } from '@sand/web-client/contract'
import { absolute, join, split } from '../paths'
import { keepNew, type FolderForm } from './form'

type PlanProjects = Pick<Projects, 'get' | 'add' | 'mkdir'>

export interface Matches {
  target: string
  groups: ProjectGroup[]
  chosen: string
}

export interface Plan {
  label: string
  note?: string
  error?: boolean
  matches?: Matches
  opens?: boolean
  run?(): Promise<AddedProject>
}

const labels = {
  add: 'Add project',
  create: 'Create folder and add',
  copy: 'Add as a copy',
  open: 'Open project',
}

const hasCopyOn = (group: ProjectGroup, device: string) => group.locations.some(entry => entry.device === device)

const chosenMatch = (form: FolderForm, target: string, groups: ProjectGroup[]) => {
  const picked = form.match.get()
  if (picked?.target === target) return picked.project
  return groups.find(group => !hasCopyOn(group, form.pc.id))?.id ?? keepNew
}

const matched = (projects: PlanProjects, form: FolderForm, target: string, groups: ProjectGroup[]): Plan => {
  const { pc } = form
  const chosen = chosenMatch(form, target, groups)
  const matches = { target, groups, chosen }
  if (chosen === keepNew) return { label: labels.add, matches, run: () => projects.add(target, pc.id) }
  const here = projects.get(chosen)?.locations.find(entry => entry.device === pc.id)
  return {
    label: labels.copy,
    matches,
    note: here ? `Replaces its copy at ${here.path}.` : undefined,
    run: () => projects.add(target, pc.id, chosen),
  }
}

const inspected = (projects: PlanProjects, form: FolderForm, target: string): Plan => {
  const { pc } = form
  const folder = form.folder(target)
  if (folder.state === 'loading') return { label: labels.add }
  if (folder.state === 'failed') return { label: labels.add, error: true, note: `Couldn’t look inside ${target} (${folder.error}). Check that ${pc.name} is online and try again.` }
  const { path, project, restores, matches } = folder.value
  const name = (id: string) => projects.get(id)?.name ?? 'a project'
  if (project) return { label: labels.open, note: `Already added as ${name(project)}.`, opens: true, run: async () => ({ path, device: pc.id }) }
  if (restores) return { label: labels.copy, note: `Adds it back as a copy of ${name(restores)}.`, run: () => projects.add(target, pc.id, restores) }
  const groups = matches.flatMap(id => projects.get(id) ?? [])
  if (groups.length) return matched(projects, form, target, groups)
  return { label: labels.add, run: () => projects.add(target, pc.id) }
}

export const plan = (projects: PlanProjects, form: FolderForm): Plan => {
  const { pc, place } = form
  const { sep } = place
  const { dir, leaf } = split(form.path.get().trim(), sep)
  if (dir === undefined) return { label: labels.add, note: `Type a full path, such as ${join(place.root, '', sep)}` }
  const listing = form.listing(dir)
  if (listing.state === 'loading') return { label: labels.add }
  if (listing.state === 'failed') return { label: labels.add, error: true, note: `Couldn’t read ${dir} (${listing.error}). Check the path and that ${pc.name} is online.` }
  if (!listing.value.exists) return { label: labels.add, error: true, note: `${dir} doesn’t exist.` }
  const target = leaf ? join(dir, leaf, sep) : dir
  if (absolute(target, place) === place.home) return { label: labels.add, note: 'Your home folder can’t be a project. Pick a folder inside it.' }
  if (leaf === '.' || leaf === '..') return { label: labels.add }
  const exists = leaf ? listing.value.folders.includes(leaf) : listing.value.exists
  if (exists) return inspected(projects, form, target)
  return {
    label: labels.create,
    note: 'Creates this folder.',
    run: async () => {
      await projects.mkdir(target, pc.id)
      return projects.add(target, pc.id)
    },
  }
}
