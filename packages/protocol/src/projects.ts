export interface ProjectCopy {
  path: string
  added: number
  updated: number
  removed?: boolean
}

export interface Project {
  id: string
  name: string
  remote?: string
  copies: Record<string, ProjectCopy>
  updated: number
  hidden?: boolean
  deleted?: boolean
}

export interface ProjectPatch {
  name?: string
  hidden?: boolean
}

export interface ProjectRef {
  path: string
  device?: string
}

export interface ProjectPlace {
  device: string
  home: string
  sep: string
  root: string
  scratch: string
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
  matches: string[]
}

export interface HostProjects {
  all(): Project[]
  merge(incoming: Project[]): Promise<boolean>
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

declare module 'drydock' {
  interface Services {
    hostProjects: HostProjects
  }

  interface Events {
    'host.projects': () => void
  }
}
