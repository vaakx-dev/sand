import type { Project, ProjectCopy, ProjectList } from '@sand/host-projects/contract'
import { eachSettled, liveProjects } from '@sand/kit'
import type { Pcs, ReachablePc } from '@sand/pc-link/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'

const input = z.object({ hidden: z.boolean().default(false).describe('Include hidden projects') })

type Lists = Map<string, ProjectList>

const stateOf = (pc: ReachablePc, lists: Lists, project: Project) => {
  if (!pc.online) return 'offline'
  return lists.get(pc.id)?.missing.includes(project.id) ? 'folder missing' : 'online'
}

const copyLine = (pcs: ReachablePc[], lists: Lists, project: Project) => ([device, copy]: [string, ProjectCopy]) => {
  const pc = pcs.find(candidate => candidate.id === device)
  return pc ? `  ${pc.name}: ${copy.path} (${stateOf(pc, lists, project)})` : `  ${device}, a PC no longer paired: ${copy.path}`
}

const projectLines = (pcs: ReachablePc[], lists: Lists) => (project: Project) => {
  const copies = Object.entries(project.copies)
  const head = [`- ${project.name}`, `id ${project.id}`, ...(project.hidden ? ['hidden'] : []), ...(project.remote ? [project.remote] : [])].join(' · ')
  return [head, ...(copies.length ? copies.map(copyLine(pcs, lists, project)) : ['  no copies'])].join('\n')
}

const rootLine = (lists: Lists) => (pc: ReachablePc) => `  ${pc.name}: ${lists.get(pc.id)?.root ?? pc.error ?? 'did not answer'}`

export const projectsTool = (pcs: Pcs): Tool<typeof input> => ({
  name: 'projects',
  group: 'projects',
  description: 'List projects with their copies on each PC (PC, folder, online), and the folder each PC puts new projects in.',
  input,
  async run({ hidden }) {
    const all = await pcs.list()
    const { values } = await eachSettled(
      all.filter(pc => pc.online),
      async pc => [pc.id, await pcs.projects(pc)] as const,
    )
    const lists: Lists = new Map(values)
    const projects = liveProjects([...lists.values()]).filter(project => hidden || !project.hidden)
    const lines = projects.length ? projects.map(projectLines(all, lists)) : ['No projects']
    return [...lines, '', 'New projects go in:', ...all.map(rootLine(lists))].join('\n')
  },
})
