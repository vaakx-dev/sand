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

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'projects.list': {}
    'projects.inspect': { path: string }
    'projects.add': { path: string; project?: string }
    'projects.update': { project: string; patch: ProjectPatch }
    'projects.remove': { project: string; device?: string }
    'projects.root': { root: string }
    'projects.create': { name: string }
    'projects.clone': { url: string; into: string; job?: string; project?: string }
    'projects.icon': { project: string }
  }

  interface WireEvents {
    'projects.change': [list: ProjectList]
    'projects.progress': [progress: CloneProgress]
  }
}

declare module 'drydock' {
  interface Services {
    hostProjects: HostProjects
  }

  interface Events {
    'host.projects': () => void
  }
}
