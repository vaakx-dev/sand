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

export interface ProjectRef {
  path: string
  device: string
}
