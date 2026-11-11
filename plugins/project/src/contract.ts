import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import type { OfferedPath } from '@sand/transfers/contract'
import { service } from 'drydock'
import { z } from 'zod'

export * from './projects'

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

export interface LocalCopy {
  project: string
  path: string
}

export interface ProjectFiles {
  copies(): LocalCopy[]
  ofFolder(dir: string): string | null
  name(project: string): string | undefined
}

export const projectFiles = service<ProjectFiles>('projectFiles')

export interface AddedProject {
  path: string
  device: string
}

export interface ProjectAddOptions {
  project?: string
  added?(project: AddedProject): unknown
}

export interface ProjectAdd {
  open(options?: ProjectAddOptions): void
}

export const projectAdd = service<ProjectAdd>('projectAdd')

export interface ProjectRow {
  project: string
  name: string
  folder?: string
  remote?: string
  hidden?: boolean
  icon?: ProjectIcon
  otherPcs?: { pc: string; folder: string }[]
}

export interface CreatedProject extends ProjectRow {
  sameRemote?: string[]
}

export interface RemovedProject {
  project: string
  removed: true
}

export interface LocalFile {
  path: string
  size: number
}

export interface IgnoredFiles {
  files: LocalFile[]
  folders: string[]
  truncated: boolean
}

export interface BringStep {
  project: string
  path: string
  step: string
}

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

const bringHow = z.enum(['clone', 'copy'])

const bringInput = z.object({ project: z.string(), from: z.string().min(1), path: z.string().trim().min(1), how: bringHow, files: z.array(z.string()) })

export type BringInput = z.infer<typeof bringInput>

const offerInput = z.object({ project: z.string(), how: bringHow, files: z.array(z.string()) })

export type ProjectOffer = z.infer<typeof offerInput>

export const projectsList = request('projects.list', { input: z.object({}), output: type<ProjectList>() })
export const helloProjects = helloField<ProjectList>('projects')
export const projectsInspect = request('projects.inspect', { input: pathInput, output: type<ProjectFolder>() })
export const projectsAdd = request('projects.add', { input: z.object({ path: z.string(), project: z.string().optional() }), output: type<Project>() })
export const projectsUpdate = request('projects.update', { input: z.object({ project: z.string(), patch: patchInput }), output: type<Project>() })
export const projectsRemove = request('projects.remove', { input: z.object({ project: z.string(), device: z.string().optional() }), output: type<void>() })
export const projectsRoot = request('projects.root', { input: z.object({ root: z.string() }), output: type<ProjectList>() })
export const projectsCreate = request('projects.create', { input: z.object({ name: z.string() }), output: type<Project>() })
export const projectsSync = request('projects.sync', { input: z.object({ projects: z.array(z.unknown()) }), output: type<Project[]>(), callers: 'pc' })

export const createInput = z.object({
  folder: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  git: z.boolean().optional(),
  copyOf: z.string().min(1).optional(),
})
export const updateInput = z.object({
  project: z.string(),
  name: z.string().trim().min(1).optional(),
  hidden: z.boolean().optional(),
  icon: iconInput.nullable().optional(),
})
export const removeInput = z.object({ project: z.string(), pc: z.string().min(1).optional() })
export const rootInput = z.object({ folder: z.string().trim().min(1).optional() })

const runtime = 'runtime'

export const runtimeProjectRows = request('projects.runtime.rows', { input: z.object({}), output: type<ProjectRow[]>(), callers: runtime })
export const runtimeProjectRow = request('projects.runtime.row', { input: z.object({ project: z.string() }), output: type<ProjectRow>(), callers: runtime })
export const runtimeProjectCreate = request('projects.runtime.create', { input: createInput, output: type<CreatedProject>(), callers: runtime })
export const runtimeProjectUpdate = request('projects.runtime.update', { input: updateInput, output: type<ProjectRow>(), callers: runtime })
export const runtimeProjectRemove = request('projects.runtime.remove', { input: removeInput, output: type<ProjectRow | RemovedProject>(), callers: runtime })
export const runtimeProjectRoot = request('projects.runtime.root', { input: rootInput, output: type<{ root: string }>(), callers: runtime })

export const filesList = request('files.list', { input: z.object({ cwd: z.string().optional() }), output: type<string[]>(), place: 'thread' })
export const filesGrep = request('files.grep', { input: z.object({ cwd: z.string(), query: z.string() }), output: type<GrepMatch[]>(), place: 'thread' })
export const filesRead = request('files.read', { input: z.object({ cwd: z.string(), path: z.string() }), output: type<FileContent>(), place: 'thread' })
export const fsBrowse = request('fs.browse', { input: pathInput, output: type<FolderListing>() })
export const fsMkdir = request('fs.mkdir', { input: pathInput, output: type<void>() })
export const projectsIgnored = request('projects.ignored', { input: pathInput, output: type<IgnoredFiles>() })
export const projectsBring = request('projects.bring', { input: bringInput, output: type<ProjectRow>() })
export const projectsOffer = request('projects.offer', { input: offerInput, output: type<OfferedPath>(), callers: 'pc' })

export const projectsChange = wireEvent<ProjectList>('projects.change')
export const projectsBringing = wireEvent<BringStep>('projects.bringing')
