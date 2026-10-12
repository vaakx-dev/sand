import type { FolderListing, Project, ProjectFolder, ProjectList, ProjectPatch } from '@sand/host-projects/contract'
import type { ProjectLook, WireEvent, WireRequest } from '@sand/protocol'
import type { Machines, ProjectEntry, ProjectGroup, Projects, Wire } from '../contract'
import { folderName, isInside, sandHomeProject, uuid } from '@sand/kit'
import type { Context } from 'drydock'
import type { Store } from '../threads/store'
import { buildGroups, copyEntry, groupAt, type Lists } from './groups'
import { projectIcons } from './icons'
import { keptLists } from './kept'

const fallback = { home: '~', sep: '/', root: '~', scratch: '' }

export const createProjects = (ctx: Context, wire: Wire, store: Store, machines: Machines) => {
  const lists: Lists = new Map()
  const progress = new Map<string, (text: string) => void>()
  const call = <T>(request: WireRequest, device: string) => wire.call<T>(request, device)
  let view: ProjectGroup[] | undefined
  let shown = ''

  const all = () => (view ??= buildGroups(lists, store.threads.values()))

  const changed = () => {
    view = undefined
    shown = JSON.stringify(all())
    ctx.emit('projects.change')
  }

  const set = (device: string, list: ProjectList) => {
    lists.set(device, list)
    changed()
  }

  const refresh = (device: string) =>
    call<ProjectList>({ type: 'projects.list' }, device).then(
      list => set(device, list),
      () => {},
    )

  const event = (device: string, event: WireEvent) => {
    if (event.name === 'projects.change') set(device, event.args[0])
    if (event.name !== 'projects.progress') return
    const { job, text } = event.args[0]
    progress.get(job)?.(text)
  }

  const forget = (device: string) => {
    if (lists.delete(device)) changed()
  }

  const restore = (saved: unknown, devices: Set<string>) => {
    const missing = keptLists(saved).filter(([device]) => !lists.has(device) && (device === store.here() || devices.has(device)))
    for (const [device, list] of missing) lists.set(device, list)
    if (missing.length) changed()
  }

  const refreshHere = () => refresh(store.here())

  ctx.on('wire.hello', () => void refreshHere())
  ctx.on('wire.event', wireEvent => event(store.here(), wireEvent))
  ctx.on('threads.change', () => {
    view = undefined
    if (JSON.stringify(all()) !== shown) changed()
  })

  const get = (id: string) => all().find(group => group.id === id)

  const place = (device: string) => lists.get(device) ?? { ...fallback, device }

  const inScratch = (path: string, device: string) => {
    const { scratch } = place(device)
    return Boolean(scratch) && isInside(path, scratch)
  }

  const group = (path: string, device: string) => (inScratch(path, device) ? undefined : groupAt(all(), path, device, place(device).home))

  const icons = projectIcons(ctx, wire, machines)
  ctx.on('wire.hello', icons.clear)
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

  const registered = async (request: WireRequest, device: string) => {
    const project = await call<Project>(request, device)
    await refresh(device)
    return entryFor(project, device)
  }

  const update = async (target: ProjectGroup, patch: ProjectPatch) => {
    await call<Project>({ type: 'projects.update', project: target.id, patch }, store.here())
    await refreshHere()
  }

  const projects: Projects = {
    list: () => all().flatMap(found => found.locations),
    groups: options => all().filter(found => options?.hidden || !found.hidden),
    get,
    group,
    name: (path, device) => group(path, device)?.name || folderName(path),
    quick: (path, device) => !path || inScratch(path, device),
    icon(path, device) {
      const found = group(path, device)
      return found && groupIcon(found)
    },
    groupIcon,
    place,
    browse: (path, device) => call<FolderListing>({ type: 'fs.browse', path }, device),
    mkdir: (path, device) => call<void>({ type: 'fs.mkdir', path }, device),
    inspect: (path, device) => call<ProjectFolder>({ type: 'projects.inspect', path }, device),
    add: (path, device, project) => registered({ type: 'projects.add', path, ...(project ? { project } : {}) }, device),
    rename: (target, name) => update(target, { name }),
    hide: (target, hidden) => update(target, { hidden }),
    setIcon: (target, icon) => update(target, { icon }),
    async remove(target) {
      await call<void>({ type: 'projects.remove', project: target.id }, store.here())
      await refreshHere()
    },
    async removeCopy(entry) {
      await call<void>({ type: 'projects.remove', project: entry.project, device: entry.device }, store.here())
      await refreshHere()
    },
    async setRoot(root, device) {
      set(device, await call<ProjectList>({ type: 'projects.root', root }, device))
    },
    create: (name, device) => registered({ type: 'projects.create', name }, device),
    async clone(url, into, device, onProgress, project) {
      const job = uuid()
      if (onProgress) progress.set(job, onProgress)
      try {
        return await registered({ type: 'projects.clone', url, into, job, ...(project ? { project } : {}) }, device)
      } finally {
        progress.delete(job)
      }
    },
  }

  return { projects, refresh, event, forget, restore, kept: () => Object.fromEntries(lists) }
}

export type ProjectService = ReturnType<typeof createProjects>
