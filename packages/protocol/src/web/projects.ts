import type { FolderListing, ProjectFolder, ProjectPlace } from '../projects'

export interface ProjectEntry {
  project: string
  name: string
  path: string
  device?: string
  added: number
  missing?: boolean
  threads: number
  updated: number
}

export interface ProjectGroup {
  id: string
  name: string
  remote?: string
  hidden: boolean
  threads: number
  updated: number
  locations: ProjectEntry[]
}

export interface Projects {
  list(): ProjectEntry[]
  groups(options?: { hidden?: boolean }): ProjectGroup[]
  get(id: string): ProjectGroup | undefined
  group(path: string, device?: string): ProjectGroup | undefined
  icon(path: string, device?: string): string | undefined
  place(device?: string): ProjectPlace
  browse(path: string, device?: string): Promise<FolderListing>
  mkdir(path: string, device?: string): Promise<void>
  inspect(path: string, device?: string): Promise<ProjectFolder>
  add(path: string, device?: string, project?: string): Promise<ProjectEntry>
  removeCopy(entry: ProjectEntry): Promise<void>
  remove(group: ProjectGroup): Promise<void>
  rename(group: ProjectGroup, name: string): Promise<void>
  hide(group: ProjectGroup, hidden: boolean): Promise<void>
  setRoot(root: string, device?: string): Promise<void>
  create(name: string, device?: string): Promise<ProjectEntry>
  clone(url: string, into: string, device?: string, progress?: (text: string) => void, project?: string): Promise<ProjectEntry>
}
