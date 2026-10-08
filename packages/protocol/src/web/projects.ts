import type { FolderListing, Project, ProjectPatch, ProjectPlace, ProjectRef } from '../projects'

export interface ProjectEntry extends Project {
  device?: string
}

export interface ProjectGroup {
  id: string
  name: string
  link?: string
  hidden: boolean
  threads: number
  updated: number
  locations: ProjectEntry[]
}

export interface Projects {
  list(): ProjectEntry[]
  groups(options?: { hidden?: boolean }): ProjectGroup[]
  group(path: string, device?: string): ProjectGroup | undefined
  icon(path: string, device?: string): string | undefined
  place(device?: string): ProjectPlace
  browse(path: string, device?: string): Promise<FolderListing>
  mkdir(path: string, device?: string): Promise<void>
  add(path: string, device?: string, link?: string): Promise<ProjectEntry>
  remove(path: string, device?: string): Promise<void>
  update(ref: ProjectRef, patch: ProjectPatch): Promise<void>
  rename(group: ProjectGroup, name: string): Promise<void>
  hide(group: ProjectGroup, hidden: boolean): Promise<void>
  link(from: ProjectRef, to: ProjectRef): Promise<string>
  unlink(ref: ProjectRef): Promise<void>
  setRoot(root: string, device?: string): Promise<void>
  create(name: string, device?: string): Promise<ProjectEntry>
  clone(url: string, into: string, device?: string, progress?: (text: string) => void): Promise<ProjectEntry>
}
