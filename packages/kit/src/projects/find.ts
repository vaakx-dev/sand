import type { Project, ProjectRef } from '@sand/protocol'

export const findProject = (projects: Project[], ref: string) => {
  const wanted = ref.toLowerCase()
  const project = projects.find(candidate => candidate.id === ref) ?? projects.find(candidate => candidate.name.toLowerCase() === wanted)
  if (!project) throw new Error(`No project named "${ref}"; the projects are ${projects.map(candidate => candidate.name).join(', ')}`)
  return project
}

export const projectCopy = (project: Project, pc: { id: string; name: string }): ProjectRef => {
  const copy = project.copies[pc.id]
  if (!copy) throw new Error(`${project.name} has no copy on ${pc.name}`)
  return { path: copy.path, device: pc.id }
}
