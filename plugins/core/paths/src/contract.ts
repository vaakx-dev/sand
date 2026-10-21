import { service } from 'drydock'

export interface Paths {
  home: string
  projectFolder(cwd: string, project?: string | null): string
}

export const paths = service<Paths>('paths')
