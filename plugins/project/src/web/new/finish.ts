import { composer } from '@sand/composer/contract'
import type { ProjectsContext } from '../context'
import type { Choice } from './types'

const addFolder = async (ctx: ProjectsContext, choice: Choice, device: string) => {
  if (!choice.project) {
    const folder = await ctx.projects.inspect(choice.path, device)
    if (folder.project) return folder.path
  }
  return (await ctx.projects.add(choice.path, device, choice.project)).path
}

const make = async (ctx: ProjectsContext, choice: Choice) => {
  const device = choice.pc.id
  const { projects } = ctx
  if (choice.how === 'create') return (await projects.create(choice.name, device)).path
  if (choice.how === 'create-folder') await projects.mkdir(choice.path, device)
  return addFolder(ctx, choice, device)
}

export const finish = async (ctx: ProjectsContext, choice: Choice, progress: (text: string) => void) => {
  progress('Working…')
  const path = await make(ctx, choice)
  await ctx.threads.draft(path, choice.pc.id)
  ctx.get(composer)?.focus()
}
