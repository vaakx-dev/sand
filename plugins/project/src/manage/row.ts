import type { Project, ProjectRow } from '../contract'
import { localCopy } from '../registry/list'

export const projectRow = (project: Project, device: string, names: Map<string, string>): ProjectRow => {
  const here = localCopy(project, device)
  const otherPcs = Object.entries(project.copies)
    .filter(([pc, copy]) => pc !== device && !copy.removed)
    .map(([pc, copy]) => ({ pc: names.get(pc) ?? pc, folder: copy.path }))
  return {
    project: project.id,
    name: project.name,
    ...(here && { folder: here.path }),
    ...(project.remote && { remote: project.remote }),
    ...(project.pinned && { pinned: true }),
    ...(project.archived && { archived: true }),
    ...(project.icon && { icon: project.icon }),
    ...(otherPcs.length > 0 && { otherPcs }),
  }
}
