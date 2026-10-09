import { copyPath, projectOfFolder } from '../projects/local'
import { nearestRoot } from './roots'

const registered = (cwd: string, project?: string | null) => {
  const known = project ? copyPath(project) : undefined
  if (known) return known
  const found = projectOfFolder(cwd)
  return found ? copyPath(found) : undefined
}

export const projectFolder = (cwd: string, project?: string | null): string => registered(cwd, project) ?? nearestRoot(cwd) ?? cwd
