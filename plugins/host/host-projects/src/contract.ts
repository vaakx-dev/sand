import type { Project, ProjectIcon } from '@sand/protocol'

export type { Project, ProjectCopy, ProjectIcon, ProjectIconFile, ProjectRef } from '@sand/protocol'

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
  restores?: string
  matches: string[]
}

export interface HostProjects {
  all(): Project[]
  merge(incoming: Project[]): Promise<boolean>
}

export interface ProjectPeers {
  pull(): Promise<void>
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
  }

  interface WireEvents {
    'projects.change': [list: ProjectList]
    'projects.progress': [progress: CloneProgress]
  }
}

declare module 'drydock' {
  interface Services {
    hostProjects: HostProjects
    projectPeers: ProjectPeers
  }

  interface Events {
    'host.projects': () => void
  }
}
