import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { isAbsolute, resolve } from 'node:path'
import { z } from 'zod'
import { projectCreate, projectRemove, projectRoot, projectRows, projectUpdate } from '@sand/project/contract'

const group: McpGroup = { name: 'projects', label: 'Projects', summary: 'list, add, create, rename, hide and remove projects, and set where new ones go' }

const project = z.string().describe('The project id, from project_list')
const pc = z.string().min(1).optional()

const listInput = z.object({})

const createInput = z.object({
  folder: z
    .string()
    .min(1)
    .optional()
    .describe('The folder to add, created if it does not exist yet. Leave it out to create an empty project called name in the folder where new projects go'),
  name: z.string().min(1).optional().describe("The project's name (default: the folder's name)"),
  git: z.boolean().optional().describe("Start a git repo in the folder unless it's in one already"),
  copyOf: z.string().min(1).optional().describe('A project id: add the folder as another copy of that project, such as a clone of the same repo on another PC'),
  pc: pc.describe('Another of your PCs to add it on, by name; folder is then a full path on that PC (default: this PC)'),
})

const updateInput = z.object({
  project,
  name: z.string().min(1).optional().describe('Rename it'),
  hidden: z.boolean().optional().describe("Hide it from sand's lists of projects, or show it again"),
  icon: z
    .object({
      shape: z.number().int().positive().optional().describe('A shape number from 1 up (default: the first shape)'),
      hue: z.number().min(0).lt(360).optional().describe('A colour hue in degrees, such as 0 red, 120 green or 240 blue'),
    })
    .nullable()
    .optional()
    .describe("Its drawn icon, or null for the default; a project whose folder has its own icon shows that one instead"),
})

const removeInput = z.object({
  project,
  pc: pc.describe('Only forget its folder on this PC, by name; the project stays on the others'),
})

const rootInput = z.object({
  folder: z.string().min(1).optional().describe('A full path to put new projects in from now on; leave it out to read the current one'),
  pc: pc.describe('Another of your PCs, by name (default: this PC)'),
})

const removeRules = "Remove a project from sand. Folders and files stay where they are. Returns removed: true once it's gone."

const folderOf = (folder: string | undefined, here: string | undefined) => (folder && here && !isAbsolute(folder) && !folder.startsWith('~') ? resolve(here, folder) : folder)

export const projectTools: McpTool[] = [
  {
    name: 'project_list',
    description:
      "List sand's projects by name: each one's folder on this PC, its git remote and whether it is hidden. Start threads in one with thread_start's project.",
    input: listInput,
    parts: [{ feature: 'pcs', description: 'otherPcs lists its folders on your other PCs.' }],
    access: 'read',
    group: group.name,
    run: (_, { call }) => call(projectRows, {}),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'project_create',
    description:
      'Add a folder as a project, or create an empty one. Returns the project as project_list shows it.',
    input: createInput,
    parts: [
      { feature: 'git', fields: ['git'] },
      {
        feature: 'pcs',
        fields: ['copyOf', 'pc'],
        description: 'sameRemote lists projects with the same git remote; if the folder is really a copy of one, remove this project and add the folder again with copyOf.',
      },
    ],
    access: 'operate',
    group: group.name,
    run: ({ folder, ...input }, { call, here }) => call(projectCreate, { ...input, folder: input.pc ? folder : folderOf(folder, here) }),
  } satisfies McpTool<typeof createInput>,
  {
    name: 'project_update',
    description: 'Rename a project, hide or show it, or change its icon; returns the project as project_list shows it',
    input: updateInput,
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(projectUpdate, input),
  } satisfies McpTool<typeof updateInput>,
  {
    name: 'project_remove',
    description: removeRules,
    input: removeInput,
    parts: [{ feature: 'pcs', fields: ['pc'], description: 'It removes it on every PC; with pc it only forgets its folder on that PC and returns the project as project_list shows it.' }],
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(projectRemove, input),
  } satisfies McpTool<typeof removeInput>,
  {
    name: 'project_root',
    description: 'Read or change the folder where new empty projects go; returns it.',
    input: rootInput,
    parts: [{ feature: 'pcs', fields: ['pc'] }],
    access: 'operate',
    group: group.name,
    run: ({ folder, ...input }, { call, here }) => call(projectRoot, { ...input, folder: input.pc ? folder : folderOf(folder, here) }),
  } satisfies McpTool<typeof rootInput>,
]

export const offerProjectTools = (found: McpTools) => joinDisposers(found.group(group), ...projectTools.map(tool => found.register(tool)))
