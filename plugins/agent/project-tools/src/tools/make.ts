import type { Project } from '@sand/host-projects/contract'
import { folderName, projectCopy } from '@sand/kit'
import { longCall } from '@sand/kit/host'
import type { Pcs } from '@sand/pc-link/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { folderOn } from '../folder'

const group = 'projects'

const pcInput = z.string().optional().describe('PC name or id. Defaults to this PC')

const createInput = z.object({ name: z.string().describe('Project and folder name'), pc: pcInput })

export const createTool = (pcs: Pcs): Tool<typeof createInput> => ({
  name: 'project_create',
  group,
  description: "Create a new empty project (a folder with a fresh git repository) in a PC's project folder.",
  input: createInput,
  async run({ name, pc }) {
    const at = await pcs.find(pc)
    const project = await pcs.call<Project>({ type: 'projects.create', name }, at.id)
    return `Created project "${project.name}" (id ${project.id}) on ${at.name} at ${projectCopy(project, at).path}.`
  },
})

const cloneInput = z.object({
  url: z.string().describe('Git URL to clone'),
  pc: pcInput,
  project: z.string().optional().describe('An existing project (name or id) this clone becomes another copy of'),
})

const repoName = (url: string) => folderName(url.trim().replace(/\.git$/, '')).replace(/^.*:/, '')

export const cloneTool = (pcs: Pcs): Tool<typeof cloneInput> => ({
  name: 'project_clone',
  group,
  description: "Clone a git repository into a PC's project folder and save it as a project, or as another copy of an existing project. Runs no setup commands.",
  input: cloneInput,
  async run({ url, pc, project }) {
    const at = await pcs.find(pc)
    const existing = project ? await pcs.project(project) : undefined
    const held = existing?.copies[at.id]
    if (existing && held) throw new Error(`${existing.name} already has a copy on ${at.name}, at ${held.path}`)
    const { path: into } = await folderOn(pcs, at, repoName(url))
    const cloned = await pcs.call<Project>({ type: 'projects.clone', url, into, ...(existing && { project: existing.id }) }, at.id, longCall)
    const as = existing ? `another copy of "${cloned.name}"` : `project "${cloned.name}"`
    return `Cloned ${url} into ${into} on ${at.name}, as ${as} (id ${cloned.id}).`
  },
})

const addInput = z.object({
  path: z.string().describe('Folder that already exists on that PC'),
  pc: pcInput,
  project: z.string().optional().describe('An existing project (name or id) this folder becomes the copy of on that PC'),
})

export const addTool = (pcs: Pcs): Tool<typeof addInput> => ({
  name: 'project_add',
  group,
  description:
    'Save a folder that is already on a PC as a project, or as the copy of an existing project on that PC. A folder whose copy was removed becomes that copy again. Copies no files and runs no setup.',
  input: addInput,
  async run({ path, pc, project }) {
    const at = await pcs.find(pc)
    const existing = project ? await pcs.project(project) : undefined
    const added = await pcs.call<Project>({ type: 'projects.add', path, ...(existing && { project: existing.id }) }, at.id)
    const as = existing ? `the copy of "${added.name}"` : `project "${added.name}"`
    return `Saved ${projectCopy(added, at).path} on ${at.name} as ${as} (id ${added.id}).`
  },
})
