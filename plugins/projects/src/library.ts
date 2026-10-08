import type { ProjectList, ProjectPatch, SessionSummary } from '@sand/protocol'
import { expandHome } from '@sand/host'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { parse, sep } from 'node:path'
import { cloneProject, createProject } from './make'
import { mergeProjects } from './merge'
import type { ProjectRecord } from './record'
import type { ProjectRoot } from './root'
import type { ProjectStore } from './store'

export interface LibraryParts {
  store: ProjectStore
  root: ProjectRoot
  sessions: () => SessionSummary[]
  changed: () => void
}

const folder = async (path: string) => {
  const full = expandHome(path)
  const found = await stat(full).catch(() => undefined)
  if (!found?.isDirectory()) throw new Error(`${full} is not a folder`)
  return full
}

const quietFolders = () => new Set([homedir(), tmpdir(), parse(homedir()).root])

const patched = (record: ProjectRecord, patch: ProjectPatch): ProjectRecord => {
  const next = { ...record }
  if (patch.name !== undefined) {
    const name = patch.name?.trim()
    if (name) next.name = name
    else delete next.name
  }
  if (patch.link !== undefined) {
    if (patch.link) next.link = patch.link
    else delete next.link
  }
  if (patch.hidden !== undefined) next.hidden = patch.hidden
  return next
}

export const projectLibrary = ({ store, root, sessions, changed }: LibraryParts) => {
  const list = (): ProjectList => ({
    home: homedir(),
    sep,
    root: root.get(),
    projects: mergeProjects({ records: store.list(), sessions: sessions(), quiet: quietFolders(), exists: existsSync }),
  })
  const get = (path: string) => list().projects.find(project => project.path === path)
  const done = <T>(value: T) => {
    changed()
    return value
  }
  const save = async (path: string, link?: string) => {
    await store.change(path, record => {
      const { hidden: _hidden, ...rest } = record
      return { ...rest, saved: true, ...(link ? { link } : {}) }
    })
    return done(get(path))
  }
  return {
    list,
    find: (value: string) => list().projects.find(project => project.path === expandHome(value) || project.name === value),
    add: async (path: string, link?: string) => save(await folder(path), link),
    async update(path: string, patch: ProjectPatch) {
      const full = expandHome(path)
      await store.change(full, record => patched(record, patch), get(full)?.added)
      return done(get(full))
    },
    async remove(path: string) {
      const full = expandHome(path)
      if (get(full)?.threads) await store.change(full, record => ({ ...record, saved: false, hidden: true }))
      else await store.remove(full)
      done(undefined)
    },
    async setRoot(next: string) {
      await root.set(next)
      return done(list())
    },
    create: async (name: string) => save(await createProject(root.get(), name)),
    clone: async (url: string, into: string, progress: (text: string) => void) =>
      save(await cloneProject(url, expandHome(into), progress)),
  }
}

export type ProjectLibrary = ReturnType<typeof projectLibrary>
