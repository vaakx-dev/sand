import type { BringInput, FolderListing, IgnoredFiles, ProjectFolder, ProjectIcon, ProjectIconFile, ProjectLook, ProjectPlace } from '@sand/project/contract'

export type { IgnoredFiles, LocalFile } from '@sand/project/contract'

export interface ProjectEntry {
  project: string
  name: string
  path: string
  device: string
  added: number
  missing?: boolean
  updated: number
}

export interface ProjectGroup {
  id: string
  name: string
  remote?: string
  icon?: ProjectIcon
  iconFile?: ProjectIconFile
  pinned: boolean
  archived: boolean
  updated: number
  locations: ProjectEntry[]
}

export interface ProjectRef {
  path?: string
  device?: string
  project?: string | null
  quick?: boolean
}

export interface ProjectShown {
  name: string
  icon?: ProjectLook
  quick?: boolean
}

export interface Projects {
  list(): ProjectEntry[]
  known(): boolean
  groups(): ProjectGroup[]
  archived(): ProjectGroup[]
  get(id: string): ProjectGroup | undefined
  group(path: string, device: string): ProjectGroup | undefined
  shown(ref: ProjectRef): ProjectShown
  groupIcon(group: ProjectGroup): ProjectLook | undefined
  place(device: string): ProjectPlace
  browse(path: string, device: string): Promise<FolderListing>
  mkdir(path: string, device: string): Promise<void>
  inspect(path: string, device: string): Promise<ProjectFolder>
  add(path: string, device: string, project?: string): Promise<ProjectEntry>
  ignoredFiles(path: string, device: string): Promise<IgnoredFiles>
  bring(input: BringInput & { to: string }): Promise<ProjectEntry>
  removeCopy(entry: ProjectEntry): Promise<void>
  remove(group: ProjectGroup): Promise<void>
  rename(group: ProjectGroup, name: string): Promise<void>
  pin(group: ProjectGroup, pinned: boolean): Promise<void>
  archive(group: ProjectGroup, archived: boolean): Promise<void>
  setIcon(group: ProjectGroup, icon: ProjectIcon | null): Promise<void>
  setRoot(root: string, device: string): Promise<void>
  create(name: string, device: string): Promise<ProjectEntry>
}
