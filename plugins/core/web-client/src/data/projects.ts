import {
  type BringInput,
  fsBrowse,
  fsMkdir,
  helloProjects,
  type Project,
  projectCreate,
  type ProjectList,
  type ProjectLook,
  type ProjectPatch,
  projectRemove,
  projectRoot,
  projectsBring,
  projectsChange as projectsUpdate,
  projectsIgnored,
  projectsInspect,
  projectsList,
  projectUpdate,
  sandHomeProject,
} from '@sand/project/contract'
import { type Pcs, pcsChange, type Wire } from '@sand/devices-contract'
import { folderName } from '@sand/util'
import type { Context } from 'drydock'
import { type ProjectEntry, type ProjectGroup, type ProjectRef, type Projects, type ProjectShown, projectsChange, quickProject, threadsChange } from '../contract'
import { onPcHello } from '../greeted'
import type { Store } from '../threads/store'
import { buildGroups, copyEntry, groupAt, type Lists } from './groups'
import { projectIcons } from './icons'
import { keptLists } from './kept'

const fallback = { home: '~', sep: '/', root: '~' }

const bringTimeout = 60 * 60_000

export const createProjects = (ctx: Context, wire: Wire, pcs: Pcs, store: Store) => {
  const lists: Lists = new Map()
  let view: ProjectGroup[] | undefined
  let shown = ''

  const all = () => (view ??= buildGroups(lists, store.threads.values()))

  const changed = () => {
    view = undefined
    shown = JSON.stringify(all())
    ctx.emit(projectsChange)
  }

  const set = (device: string, list: ProjectList) => {
    lists.set(device, list)
    changed()
  }

  const refresh = (device: string) =>
    wire.call(projectsList, {}, device).then(
      list => set(device, list),
      () => {},
    )

  const forget = (device: string) => {
    if (lists.delete(device)) changed()
  }

  const restore = (saved: unknown, devices: Set<string>) => {
    const missing = keptLists(saved).filter(([device]) => !lists.has(device) && (device === store.here() || devices.has(device)))
    for (const [device, list] of missing) lists.set(device, list)
    if (missing.length) changed()
  }

  const refreshHere = () => refresh(store.here())

  ctx.effect(() => wire.on(projectsUpdate, (list, device) => set(device, list), { from: 'all' }))
  ctx.on(threadsChange, () => {
    view = undefined
    if (JSON.stringify(all()) !== shown) changed()
  })

  const get = (id: string) => all().find(group => group.id === id)

  const place = (device: string) => lists.get(device) ?? { ...fallback, device }

  const group = (path: string, device: string) => groupAt(all(), path, device, place(device).home)

  const icons = projectIcons(ctx, wire)
  onPcHello(ctx, wire, pcs, pc => {
    if (pc === store.here()) icons.clear()
    const list = wire.hello(helloProjects, pc)
    if (list) set(pc, list)
    else forget(pc)
  })
  ctx.on(pcsChange, icons.retryMissed)
  ctx.effect(() => icons.clear)

  const groupIcon = (found: ProjectGroup): ProjectLook | undefined => {
    if (found.id === sandHomeProject) return { app: true }
    const file = icons.get(found)
    return file ? { file } : found.icon
  }

  const entryFor = (project: Project, device: string): ProjectEntry => {
    const found = get(project.id)?.locations.find(location => location.device === device)
    if (found) return found
    const copy = project.copies[device]
    if (!copy) throw new Error(`${project.name} has no copy on that PC`)
    return copyEntry(lists, project, device, copy)
  }

  const listed = async (asked: Promise<{ project: string }>, device: string) => {
    const { project } = await asked
    await refresh(device)
    const found = lists.get(device)?.projects.find(candidate => candidate.id === project)
    if (!found) throw new Error("The project was added, but this page couldn't load it yet. Reload to see it.")
    return entryFor(found, device)
  }

  const brought = ({ to, ...input }: BringInput & { to: string }) => listed(wire.call(projectsBring, input, to, { timeout: bringTimeout }), to)

  const created = (input: { folder?: string; name?: string; copyOf?: string }, device: string) => listed(wire.call(projectCreate, input, device), device)

  const update = async (target: ProjectGroup, patch: ProjectPatch) => {
    await wire.call(projectUpdate, { project: target.id, ...patch }, store.here())
    await refreshHere()
  }

  const remove = async (project: string, pc?: string) => {
    await wire.call(projectRemove, { project, ...(pc && { pc }) }, store.here())
    await refreshHere()
  }

  const shownOf = ({ path = '', device = '', project, quick }: ProjectRef): ProjectShown => {
    if (quick) return quickProject
    const found = (project ? get(project) : undefined) ?? (path ? group(path, device) : undefined)
    if (found) return { name: found.name || folderName(path || (found.locations[0]?.path ?? '')), icon: groupIcon(found) }
    if (path) return { name: folderName(path) }
    if (project) return { name: 'Unknown project' }
    return quickProject
  }

  const projects: Projects = {
    list: () => all().flatMap(found => found.locations),
    known: () => lists.has(store.here()),
    groups: () => all().filter(found => !found.archived),
    archived: () => all().filter(found => found.archived),
    get,
    group,
    shown: shownOf,
    groupIcon,
    place,
    browse: (path, device) => wire.call(fsBrowse, { path }, device),
    mkdir: (path, device) => wire.call(fsMkdir, { path }, device),
    inspect: (path, device) => wire.call(projectsInspect, { path }, device),
    add: (path, device, project) => created({ folder: path, ...(project && { copyOf: project }) }, device),
    ignoredFiles: (path, device) => wire.call(projectsIgnored, { path }, device),
    bring: brought,
    rename: (target, name) => update(target, { name }),
    pin: (target, pinned) => update(target, { pinned }),
    archive: (target, archived) => update(target, { archived }),
    setIcon: (target, icon) => update(target, { icon }),
    remove: target => remove(target.id),
    removeCopy: entry => remove(entry.project, entry.device),
    async setRoot(root, device) {
      await wire.call(projectRoot, { folder: root }, device)
      await refresh(device)
    },
    create: (name, device) => created({ name }, device),
  }

  return { projects, refresh, forget, restore, kept: () => Object.fromEntries(lists) }
}

export type ProjectService = ReturnType<typeof createProjects>
