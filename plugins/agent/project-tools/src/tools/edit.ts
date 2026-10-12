import type { Project } from '@sand/host-projects/contract'
import type { Pcs } from '@sand/pc-link/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'

const group = 'projects'

const projectInput = z.string().describe('Project name or id')

const updateInput = z.object({
  project: projectInput,
  name: z.string().optional().describe('New name'),
  hidden: z.boolean().optional().describe('Hide the project from the sidebar, or show it again'),
})

export const updateTool = (pcs: Pcs): Tool<typeof updateInput> => ({
  name: 'project_update',
  group,
  description: 'Rename a project, or hide or show it. The change reaches every paired PC.',
  input: updateInput,
  async run({ project, name, hidden }) {
    if (name === undefined && hidden === undefined) throw new Error('Give name or hidden')
    const found = await pcs.project(project)
    const here = await pcs.here()
    const updated = await pcs.call<Project>({ type: 'projects.update', project: found.id, patch: { name, hidden } }, here.id)
    const done = [name !== undefined && `named "${updated.name}"`, hidden !== undefined && (hidden ? 'hidden' : 'shown')].filter(Boolean)
    return `Project ${found.id} is now ${done.join(' and ')}.`
  },
})

const removeInput = z.object({
  project: projectInput,
  pcs: z
    .union([z.literal('all'), z.array(z.string()).min(1)])
    .describe('PC names or ids to remove the copies from, or "all" to delete the project on every PC. Only what the user asked for'),
})

export const removeTool = (pcs: Pcs): Tool<typeof removeInput> => ({
  name: 'project_remove',
  group,
  description: "Remove a project's copies on the PCs given, or the whole project on every PC. Folders stay on disk; only sand's record of them goes.",
  input: removeInput,
  async run({ project, pcs: from }) {
    const found = await pcs.project(project)
    const [here, all] = await Promise.all([pcs.here(), pcs.list()])
    const nameOf = (device: string) => all.find(pc => pc.id === device)?.name ?? device
    const remove = (device?: string) => pcs.call({ type: 'projects.remove', project: found.id, ...(device && { device }) }, here.id)
    if (from === 'all') {
      await remove()
      const folders = Object.entries(found.copies).map(([device, copy]) => `  ${nameOf(device)}: ${copy.path}`)
      return [`Removed project "${found.name}" from every PC. Its folders stay on disk:`, ...folders].join('\n')
    }
    const targets = await Promise.all(from.map(ref => pcs.find(ref)))
    const lines: string[] = []
    for (const pc of targets) {
      const copy = found.copies[pc.id]
      if (copy) await remove(pc.id)
      lines.push(copy ? `Removed the copy on ${pc.name}. Its folder stays on disk at ${copy.path}.` : `${pc.name} had no copy, so nothing changed there.`)
    }
    const left = Object.keys(found.copies).filter(device => !targets.some(pc => pc.id === device))
    lines.push(left.length ? `"${found.name}" still has copies on ${left.map(nameOf).join(', ')}.` : `"${found.name}" has no copies left but is still a project.`)
    return lines.join('\n')
  },
})
