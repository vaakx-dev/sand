import type { ProjectEntry, ProjectGroup, Projects } from '@sand/protocol'

export function groupOf(projects: Projects, cwd: string, device?: string, project?: string | null): ProjectGroup | undefined {
  return (project ? projects.get(project) : undefined) ?? projects.group(cwd, device)
}

export function copyOn(group: ProjectGroup, device?: string): ProjectEntry | undefined {
  return group.locations.find(entry => entry.device === device && !entry.missing)
}
