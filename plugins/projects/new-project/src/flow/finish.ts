import type { ProjectsContext } from '../context'
import { offerSetup } from './setup'
import type { Choice } from './types'

interface Made {
  name: string
  path: string
  note: string
  existing?: boolean
}

const added = (choice: Choice, entry: { name: string; path: string }): Made => ({
  ...entry,
  note: choice.project ? `Added a copy of ${entry.name}` : `${entry.name} added`,
})

const addFolder = async (ctx: ProjectsContext, choice: Choice, device: string): Promise<Made> => {
  if (!choice.project) {
    const folder = await ctx.projects.inspect(choice.path, device)
    if (folder.project) {
      const name = ctx.projects.get(folder.project)?.name ?? folder.name
      return { name, path: folder.path, note: `${name} is already a project`, existing: true }
    }
  }
  return added(choice, await ctx.projects.add(choice.path, device, choice.project))
}

const make = async (ctx: ProjectsContext, choice: Choice, progress: (text: string) => void): Promise<Made> => {
  const device = choice.machine.id
  const { projects } = ctx
  if (choice.how === 'create') return added(choice, await projects.create(choice.name, device))
  if (choice.how === 'clone') return added(choice, await projects.clone(choice.repo.url, choice.path, device, progress, choice.project))
  if (choice.how === 'create-folder') await projects.mkdir(choice.path, device)
  return addFolder(ctx, choice, device)
}

const open = async (ctx: ProjectsContext, choice: Choice, path: string) => {
  const device = choice.machine.id
  if (choice.done) return void choice.done({ path, device })
  await ctx.threads.draft(path, device)
  ctx.composer?.focus()
}

export const finish = async (ctx: ProjectsContext, choice: Choice, progress: (text: string) => void) => {
  progress(choice.how === 'clone' ? `Cloning ${choice.repo.name}…` : 'Working…')
  const made = await make(ctx, choice, progress)
  await open(ctx, choice, made.path)
  ctx.notify?.push(made.note)
  if ((choice.how === 'clone' || choice.how === 'add') && !made.existing) void offerSetup(ctx, made.path, choice.machine.id)
}
