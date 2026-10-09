import type { Project } from '@sand/host-projects/contract'
import type { Dispose } from 'drydock'

export interface LocalProjects {
  device?: string
  projects: Project[]
}

export interface LocalCopy {
  project: string
  path: string
}

export interface ProjectFiles {
  read(): Promise<Project[] | undefined>
  write(projects: Project[]): Promise<void>
  local(): LocalProjects
  copies(): LocalCopy[]
  ofFolder(dir: string): string | null
  onChange(onChange: () => void): Dispose
}

declare module 'drydock' {
  interface Services {
    projectFiles: ProjectFiles
  }
}
