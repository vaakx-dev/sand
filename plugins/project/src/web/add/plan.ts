import type { PcView } from '@sand/devices-contract'
import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from '../context'
import { keepNew, type AddForm, type Kind } from './form'
import { absolute, join, short, split } from './paths'

export type Target = Pick<ProjectEntry, 'path' | 'device'>

export interface Step {
  label: string
  note?: string
  error?: boolean
  matches?: { target: string; groups: ProjectGroup[] }
  opens?: boolean
  run?(): Promise<Target>
}

const labels = {
  add: 'Add project',
  createFolder: 'Create folder and add',
  create: 'Create project',
  copy: 'Add as a copy',
  open: 'Open project',
}

const plain = (name: string) => name !== '.' && name !== '..' && !/[\\/]/.test(name)

const matched = (ctx: ProjectsContext, form: AddForm, pc: PcView, target: string, groups: ProjectGroup[]): Step => {
  const matches = { target, groups }
  const picked = form.match.get()
  const project = picked?.target === target ? picked.project : undefined
  if (project === undefined) return { label: labels.add, matches }
  if (project === keepNew) return { label: labels.add, matches, run: () => ctx.projects.add(target, pc.id) }
  const here = ctx.projects.get(project)?.locations.find(entry => entry.device === pc.id)
  return {
    label: labels.copy,
    matches,
    note: here ? `Replaces the copy at ${here.path} on ${pc.name}.` : undefined,
    run: () => ctx.projects.add(target, pc.id, project),
  }
}

const inspected = (ctx: ProjectsContext, form: AddForm, pc: PcView, target: string): Step => {
  const device = pc.id
  const folder = form.folder(device, target)
  if (folder.state === 'loading') return { label: labels.add }
  if (folder.state === 'failed') return { label: labels.add, error: true, note: `Couldn't look inside ${target} (${folder.error}). Check that ${pc.name} is online and try again.` }
  const { path, project, restores, matches } = folder.value
  const name = (id: string) => ctx.projects.get(id)?.name ?? 'a project'
  if (project) return { label: labels.open, note: `Already added as ${name(project)}.`, opens: true, run: async () => ({ path, device }) }
  if (restores) return { label: labels.copy, note: `Adds it back as a copy of ${name(restores)}.`, run: () => ctx.projects.add(target, device, restores) }
  const groups = matches.flatMap(id => ctx.projects.get(id) ?? [])
  if (groups.length) return matched(ctx, form, pc, target, groups)
  return { label: labels.add, run: () => ctx.projects.add(target, device) }
}

const folderStep = (ctx: ProjectsContext, form: AddForm, pc: PcView): Step => {
  const place = ctx.projects.place(pc.id)
  const { sep } = place
  const { dir, leaf } = split(form.draftOf(pc.id).path.get(), sep)
  if (dir === undefined) return { label: labels.add, note: `Type a full path, such as ${join(short(place.root, place), '', sep)}` }
  const listing = form.listing(pc.id, dir)
  if (listing.state === 'loading') return { label: labels.add }
  if (listing.state === 'failed') return { label: labels.add, error: true, note: `Couldn't read ${dir} (${listing.error}). Check the path and that ${pc.name} is online.` }
  const target = leaf ? join(dir, leaf, sep) : dir
  if (absolute(target, place) === place.home) return { label: labels.add, note: 'Your home folder can’t be a project. Pick a folder inside it.' }
  const exists = leaf ? listing.value.folders.includes(leaf) : listing.value.exists
  if (exists) return inspected(ctx, form, pc, target)
  return {
    label: labels.createFolder,
    note: `Creates ${target} on ${pc.name}.`,
    run: async () => {
      await ctx.projects.mkdir(target, pc.id)
      return ctx.projects.add(target, pc.id)
    },
  }
}

const emptyStep = (ctx: ProjectsContext, form: AddForm, pc: PcView): Step => {
  const place = ctx.projects.place(pc.id)
  const root = short(place.root, place)
  const name = form.draftOf(pc.id).name.get().trim()
  if (!name) return { label: labels.create, note: `Goes in ${root} on ${pc.name}.` }
  if (!plain(name)) return { label: labels.create, error: true, note: 'A project name can’t contain / or \\, or be . or .. on its own.' }
  const target = join(root, name, place.sep)
  const listing = form.listing(pc.id, place.root)
  if (listing.state === 'done' && listing.value.folders.includes(name)) {
    return { label: labels.create, error: true, note: `${target} already exists. Pick another name, or add it as an existing folder.` }
  }
  return { label: labels.create, note: `Creates ${target} on ${pc.name}.`, run: () => ctx.projects.create(name, pc.id) }
}

const steps: Record<Kind, (ctx: ProjectsContext, form: AddForm, pc: PcView) => Step> = { folder: folderStep, empty: emptyStep }

export const plan = (ctx: ProjectsContext, form: AddForm): Step => {
  const pc = form.pc.get()
  const kind = form.kind.get()
  if (!pc) return { label: kind === 'empty' ? labels.create : labels.add, error: true, note: 'No PC is online. Start sand on one of your PCs, then try again.' }
  return steps[kind](ctx, form, pc)
}
