import { request, type, wireEvent } from '@sand/host-hub/contract'
import { service } from 'drydock'
import { z } from 'zod'

export interface ProjectCopy {
  path: string
  added: number
  updated: number
  removed?: boolean
}

export interface ProjectIcon {
  shape?: number
  hue?: number
}

export interface ProjectIconFile {
  hash: string
  type: string
  updated: number
}

export interface ProjectLook extends ProjectIcon {
  file?: string
  app?: boolean
  quick?: boolean
}

export interface Project {
  id: string
  name: string
  remote?: string
  icon?: ProjectIcon
  iconFile?: ProjectIconFile
  copies: Record<string, ProjectCopy>
  updated: number
  hidden?: boolean
  deleted?: boolean
}

export interface ProjectPatch {
  name?: string
  hidden?: boolean
  icon?: ProjectIcon | null
}

export interface ProjectPlace {
  device: string
  home: string
  sep: string
  root: string
}

export interface ProjectList extends ProjectPlace {
  projects: Project[]
  missing: string[]
}

export interface ProjectFolder {
  path: string
  name: string
  setup?: string
  remote?: string
  project?: string
  restores?: string
  matches: string[]
}

export interface FolderListing {
  path: string
  exists: boolean
  folders: string[]
}

export interface GrepMatch {
  path: string
  line: number
  text: string
}

export interface FileContent {
  size: number
  text?: string
  image?: string
  skipped?: 'large' | 'binary'
}

export type FileChange = 'added' | 'modified' | 'deleted'

export interface LocalCopy {
  project: string
  path: string
}

export interface ProjectFiles {
  copies(): LocalCopy[]
  ofFolder(dir: string): string | null
}

export const projectFiles = service<ProjectFiles>('projectFiles')

const iconInput = z.object({
  shape: z.number().int().positive().optional(),
  hue: z.number().min(0).lt(360).optional(),
})

const patchInput = z.object({
  name: z.string().optional(),
  hidden: z.boolean().optional(),
  icon: iconInput.nullable().optional(),
})

const pathInput = z.object({ path: z.string() })

export const projectsList = request('projects.list', { input: z.object({}), output: type<ProjectList>() })
export const projectsInspect = request('projects.inspect', { input: pathInput, output: type<ProjectFolder>() })
export const projectsAdd = request('projects.add', { input: z.object({ path: z.string(), project: z.string().optional() }), output: type<Project>() })
export const projectsUpdate = request('projects.update', { input: z.object({ project: z.string(), patch: patchInput }), output: type<Project>() })
export const projectsRemove = request('projects.remove', { input: z.object({ project: z.string(), device: z.string().optional() }), output: type<void>() })
export const projectsRoot = request('projects.root', { input: z.object({ root: z.string() }), output: type<ProjectList>() })
export const projectsCreate = request('projects.create', { input: z.object({ name: z.string() }), output: type<Project>() })
export const projectsSync = request('projects.sync', { input: z.object({ projects: z.array(z.unknown()) }), output: type<Project[]>(), callers: 'pc' })

export const filesList = request('files.list', { input: z.object({ cwd: z.string().optional() }), output: type<string[]>(), place: 'thread' })
export const filesGrep = request('files.grep', { input: z.object({ cwd: z.string(), query: z.string() }), output: type<GrepMatch[]>(), place: 'thread' })
export const filesRead = request('files.read', { input: z.object({ cwd: z.string(), path: z.string() }), output: type<FileContent>(), place: 'thread' })
export const filesChanges = request('files.changes', {
  input: z.object({ cwd: z.string() }),
  output: type<Record<string, FileChange>>(),
  place: 'thread',
})
export const fsBrowse = request('fs.browse', { input: pathInput, output: type<FolderListing>() })
export const fsMkdir = request('fs.mkdir', { input: pathInput, output: type<void>() })

export const projectsChange = wireEvent<ProjectList>('projects.change')
