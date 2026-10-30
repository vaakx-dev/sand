import {
  fsBrowse,
  fsMkdir,
  type Project,
  projectsAdd,
  projectsChange as projectsUpdate,
  projectsCreate,
  projectsInspect,
  type ProjectList,
  projectsList,
  type ProjectLook,
  type ProjectPatch,
  projectsRemove,
  projectsRoot,
  projectsUpdate as projectsPatch,
} from '@sand/project/contract'
import { sandHomeProject } from '@sand/project/projects'
import { type Pcs, pcsChange, type Wire } from '@sand/devices-contract'
import { folderName } from '@sand/util'
import type { Context } from 'drydock'
import { type ProjectEntry, type ProjectGroup, type Projects, projectsChange, threadsChange } from '../contract'
import { onPcHello } from '../greeted'
import type { Store } from '../threads/store'
import { buildGroups, copyEntry, groupAt, type Lists } from './groups'
import { projectIcons } from './icons'
import { keptLists } from './kept'

const fallback = { home: '~', sep: '/', root: '~' }

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
    void refresh(pc)
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

  const registered = async (asked: Promise<Project>, device: string) => {
    const project = await asked
    await refresh(device)
    return entryFor(project, device)
  }

  const update = async (target: ProjectGroup, patch: ProjectPatch) => {
    await wire.call(projectsPatch, { project: target.id, patch }, store.here())
    await refreshHere()
  }

  const projects: Projects = {
    list: () => all().flatMap(found => found.locations),
    groups: options => all().filter(found => options?.hidden || !found.hidden),
    get,
    group,
    name: (path, device) => group(path, device)?.name || folderName(path),
    icon(path, device) {
      const found = group(path, device)
      return found && groupIcon(found)
    },
    groupIcon,
    place,
    browse: (path, device) => wire.call(fsBrowse, { path }, device),
    mkdir: (path, device) => wire.call(fsMkdir, { path }, device),
    inspect: (path, device) => wire.call(projectsInspect, { path }, device),
    add: (path, device, project) => registered(wire.call(projectsAdd, { path, ...(project ? { project } : {}) }, device), device),
    rename: (target, name) => update(target, { name }),
    hide: (target, hidden) => update(target, { hidden }),
    setIcon: (target, icon) => update(target, { icon }),
    async remove(target) {
      await wire.call(projectsRemove, { project: target.id }, store.here())
      await refreshHere()
    },
    async removeCopy(entry) {
      await wire.call(projectsRemove, { project: entry.project, device: entry.device }, store.here())
      await refreshHere()
    },
    async setRoot(root, device) {
      set(device, await wire.call(projectsRoot, { root }, device))
    },
    create: (name, device) => registered(wire.call(projectsCreate, { name }, device), device),
  }

  return { projects, refresh, forget, restore, kept: () => Object.fromEntries(lists) }
}

export type ProjectService = ReturnType<typeof createProjects>
