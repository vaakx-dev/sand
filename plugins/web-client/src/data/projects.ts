import type { FolderListing, ProjectEntry, ProjectList, ProjectPatch, ProjectRef, Projects, Wire, WireEvent } from '@sand/protocol'
import { serverUrl } from '@sand/dom'
import { linkProjects, uuid } from '@sand/kit'
import type { Context } from 'drydock'
import { thisDevice } from '../remotes/route'
import { entryKey, groupEntries } from './groups'

const fallback = { home: '~', sep: '/', root: '~' }

const anySucceeded = async (jobs: Promise<unknown>[]) => {
  const results = await Promise.allSettled(jobs)
  if (results.some(result => result.status === 'fulfilled')) return
  const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
  throw failed?.reason ?? new Error('Nothing to update')
}

export const createProjects = (ctx: Context, wire: Wire) => {
  const lists = new Map<string, ProjectList>()
  const progress = new Map<string, (text: string) => void>()
  const icons = new Map<string, number | null | undefined>()
  const call = <T>(request: Parameters<Wire['call']>[0], device?: string) => wire.call<T>(request, device ?? thisDevice)

  const set = (device: string, list: ProjectList) => {
    lists.set(device, list)
    ctx.emit('projects.change')
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
    if (lists.delete(device)) ctx.emit('projects.change')
  }

  ctx.on('wire.hello', () => void refresh())
  ctx.on('wire.event', wireEvent => event(thisDevice, wireEvent))

  const icon = (path: string, device?: string) => {
    if (device && device !== thisDevice) return undefined
    if (!icons.has(path)) {
      icons.set(path, undefined)
      call<number | null>({ type: 'projects.icon', path }).then(
        version => {
          icons.set(path, version)
          if (version !== null) ctx.emit('projects.change')
        },
        () => icons.delete(path),
      )
    }
    const version = icons.get(path)
    return version ? serverUrl('/project-icon', { path, v: version }) : undefined
  }

  ctx.on('wire.hello', () => icons.clear())

  const list = () => [...lists].flatMap(([device, entry]) => entry.projects.map((project): ProjectEntry => (device ? { ...project, device } : project)))

  const groups = (options?: { hidden?: boolean }) => groupEntries(list()).filter(group => options?.hidden || !group.hidden)

  const group = (path: string, device?: string) => {
    const key = entryKey(path, device)
    return groupEntries(list()).find(found => found.locations.some(location => entryKey(location.path, location.device) === key))
  }

  const update = (ref: ProjectRef, patch: ProjectPatch) => call<void>({ type: 'projects.update', path: ref.path, patch }, ref.device)

  const projects: Projects = {
    icon,
    list,
    groups,
    group,
    update,
    place: device => lists.get(device ?? thisDevice) ?? fallback,
    browse: (path, device) => call<FolderListing>({ type: 'fs.browse', path }, device),
    mkdir: (path, device) => call<void>({ type: 'fs.mkdir', path }, device),
    add: (path, device, link) => call<ProjectEntry>({ type: 'projects.add', path, link }, device),
    remove: (path, device) => call<void>({ type: 'projects.remove', path }, device),
    rename: (target, name) => anySucceeded(target.locations.map(location => update(location, { name }))),
    hide: (target, hidden) => anySucceeded(target.locations.map(location => update(location, { hidden }))),
    async link(from, to) {
      const link = await linkProjects((request, device) => call(request, device), from, to)
      await Promise.all([refresh(from.device ?? thisDevice), refresh(to.device ?? thisDevice)])
      return link
    },
    unlink: ref => update(ref, { link: null }),
    setRoot: (root, device) => call<void>({ type: 'projects.root', root }, device),
    create: (name, device) => call<ProjectEntry>({ type: 'projects.create', name }, device),
    async clone(url, into, device, onProgress) {
      const job = uuid()
      if (onProgress) progress.set(job, onProgress)
      try {
        return await call<ProjectEntry>({ type: 'projects.clone', url, into, job }, device)
      } finally {
        progress.delete(job)
      }
    },
  }

  return { projects, refresh, event, forget }
}
