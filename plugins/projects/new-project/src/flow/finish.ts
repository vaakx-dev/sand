import { offerSetup } from './setup'
import { deviceOf, type Choice, type FlowContext } from './types'

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

const addFolder = async (ctx: FlowContext, choice: Choice, device?: string): Promise<Made> => {
  if (!choice.project) {
    const folder = await ctx.projects.inspect(choice.path, device)
    if (folder.project) {
      const name = ctx.projects.get(folder.project)?.name ?? folder.name
      return { name, path: folder.path, note: `${name} is already a project`, existing: true }
    }
  }
  return added(choice, await ctx.projects.add(choice.path, device, choice.project))
}

const make = async (ctx: FlowContext, choice: Choice, progress: (text: string) => void): Promise<Made> => {
  const device = deviceOf(choice.machine)
  const { projects } = ctx
  if (choice.how === 'create') return added(choice, await projects.create(choice.name!, device))
  if (choice.how === 'clone') return added(choice, await projects.clone(choice.repo!.url, choice.path, device, progress, choice.project))
  if (choice.how === 'create-folder') await projects.mkdir(choice.path, device)
  return addFolder(ctx, choice, device)
}

export const finish = async (ctx: FlowContext, choice: Choice, progress: (text: string) => void) => {
  progress(choice.how === 'clone' ? `Cloning ${choice.repo!.name}…` : 'Working…')
  const made = await make(ctx, choice, progress)
  const device = deviceOf(choice.machine)
  if (choice.done) void choice.done({ path: made.path, device })
  else {
    await ctx.threads.draft(made.path, device)
    ctx.composer?.focus()
  }
  ctx.notify?.push(made.note)
  if ((choice.how === 'clone' || choice.how === 'add') && !made.existing) void offerSetup(ctx, made.path, device)
}
