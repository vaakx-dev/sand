import type { ProjectEntry } from '@sand/protocol'
import { deviceOf, type Choice, type FlowContext } from './types'

const make = async (ctx: FlowContext, choice: Choice, progress: (text: string) => void): Promise<ProjectEntry> => {
  const device = deviceOf(choice.machine)
  const { projects } = ctx
  if (choice.how === 'create') return projects.create(choice.name!, device)
  if (choice.how === 'clone') return projects.clone(choice.repo!.url, choice.path, device, progress)
  if (choice.how === 'create-folder') await projects.mkdir(choice.path, device)
  return projects.add(choice.path, device)
}

const done: Record<Choice['how'], string> = {
  add: 'Added',
  'create-folder': 'Created and added',
  create: 'Created',
  clone: 'Cloned and added',
}

export const finish = async (ctx: FlowContext, choice: Choice, progress: (text: string) => void) => {
  const device = deviceOf(choice.machine)
  const known = new Set(ctx.projects.list().filter(project => project.device === device).map(project => project.path))
  progress(choice.how === 'clone' ? `Cloning ${choice.repo!.name}…` : 'Working…')
  const project = await make(ctx, choice, progress)
  await ctx.threads.draft(project.path, device)
  ctx.composer?.focus()
  const note = known.has(project.path) ? `${project.name} is already a project` : `${done[choice.how]} ${project.name}`
  ctx.notify?.push(note)
}
