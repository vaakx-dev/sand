import type { DraftTarget, Machine, Machines, Projects } from '@sand/web-client/contract'

export interface PcChoice {
  machine: Machine
  cwd?: string
  blocked?: string
}

const folderOn = (projects: Projects, draft: DraftTarget, device: string) => {
  if (!draft.cwd || device === draft.device) return draft.cwd
  return projects.group(draft.cwd, draft.device)?.locations.find(copy => copy.device === device && !copy.missing)?.path
}

export const pcChoices = (machines: Machines, projects: Projects, draft: DraftTarget): PcChoice[] => {
  const project = projects.group(draft.cwd, draft.device)?.name ?? 'this folder'
  return machines.list().map(machine => {
    if (!machine.online) return { machine, blocked: 'Offline' }
    const cwd = folderOn(projects, draft, machine.id)
    if (cwd === undefined) return { machine, blocked: `No copy of ${project}` }
    return { machine, cwd }
  })
}
