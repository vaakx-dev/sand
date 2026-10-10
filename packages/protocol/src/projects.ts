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

export interface ProjectRef {
  path: string
  device?: string
}
