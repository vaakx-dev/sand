import type { FolderListing, Project, ProjectFolder, ProjectList, ProjectPatch } from '@sand/host-projects/contract'
import type { WireEvent } from '@sand/protocol'
import type { ProjectEntry, ProjectGroup, Projects, Wire } from '../contract'
import { appIconUrl } from '@sand/dom'
import { isInside, sandHomeProject, uuid } from '@sand/kit'
import type { Context } from 'drydock'
import { thisDevice } from '../remotes/route'
import type { Store } from '../threads/store'
import { buildGroups, copyEntry, groupAt, type Lists, realDevice, sameDevice } from './groups'
import { projectIcons } from './icons'

const fallback = { device: '', home: '~', sep: '/', root: '~', scratch: '' }

export const createProjects = (ctx: Context, wire: Wire, store: Store) => {
  const lists: Lists = new Map()
  const progress = new Map<string, (text: string) => void>()
  const call = <T>(request: Parameters<Wire['call']>[0], device?: string) => wire.call<T>(request, device || thisDevice)
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

  const refresh = (device = thisDevice) =>
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

  ctx.on('wire.hello', () => void refresh())
  ctx.on('wire.event', wireEvent => event(thisDevice, wireEvent))
  ctx.on('threads.change', () => {
    view = undefined
    if (JSON.stringify(all()) !== shown) changed()
  })

  const get = (id: string) => all().find(group => group.id === id)

  const place = (device?: string) => lists.get(device || thisDevice) ?? fallback

  const inScratch = (path: string, device?: string) => {
    const { scratch } = place(device)
    return Boolean(scratch) && isInside(path, scratch)
  }

  const group = (path: string, device?: string) => (inScratch(path, device) ? undefined : groupAt(all(), path, device, place(device).home))

  const icons = projectIcons(ctx, wire)
  ctx.on('wire.hello', icons.clear)
  ctx.effect(() => icons.clear)

  const entryFor = (project: Project, device?: string): ProjectEntry => {
    const found = get(project.id)?.locations.find(location => sameDevice(location.device, device))
    if (found) return found
    const id = realDevice(lists, device)
    const copy = id ? project.copies[id] : undefined
    if (!id || !copy) throw new Error(`${project.name} has no copy on that PC`)
    return copyEntry(lists, project, id, copy)
  }

  const registered = async (request: Parameters<Wire['call']>[0], device?: string) => {
    const project = await call<Project>(request, device)
    await refresh(device)
    return entryFor(project, device)
  }

  const update = async (target: ProjectGroup, patch: ProjectPatch) => {
    await call<Project>({ type: 'projects.update', project: target.id, patch })
    await refresh()
  }

  const projects: Projects = {
    list: () => all().flatMap(found => found.locations),
    groups: options => all().filter(found => options?.hidden || !found.hidden),
    get,
    group,
    icon(path, device) {
      const found = group(path, device)
      if (!found) return undefined
      return found.id === sandHomeProject ? appIconUrl() : icons.get(found)
    },
    place,
    browse: (path, device) => call<FolderListing>({ type: 'fs.browse', path }, device),
    mkdir: (path, device) => call<void>({ type: 'fs.mkdir', path }, device),
    inspect: (path, device) => call<ProjectFolder>({ type: 'projects.inspect', path }, device),
    add: (path, device, project) => registered({ type: 'projects.add', path, ...(project ? { project } : {}) }, device),
    rename: (target, name) => update(target, { name }),
    hide: (target, hidden) => update(target, { hidden }),
    async remove(target) {
      await call<void>({ type: 'projects.remove', project: target.id })
      await refresh()
    },
    async removeCopy(entry) {
      const device = realDevice(lists, entry.device)
      if (!device) throw new Error('This PC is not connected yet')
      await call<void>({ type: 'projects.remove', project: entry.project, device })
      await refresh()
    },
    async setRoot(root, device) {
      set(device || thisDevice, await call<ProjectList>({ type: 'projects.root', root }, device))
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

  return { projects, refresh, event, forget }
}
