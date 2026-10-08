export type ProjectSource = 'saved' | 'used'

export interface Project {
  name: string
  path: string
  added: number
  source: ProjectSource
  threads: number
  updated: number
  link?: string
  hidden?: boolean
  missing?: boolean
}

export interface ProjectPatch {
  name?: string | null
  hidden?: boolean
  link?: string | null
}

export interface ProjectRef {
  path: string
  device?: string
}

export interface ProjectPlace {
  home: string
  sep: string
  root: string
}

export interface ProjectList extends ProjectPlace {
  projects: Project[]
}

export interface FolderListing {
  path: string
  exists: boolean
  folders: string[]
}

export interface CloneProgress {
  job: string
  text: string
}
