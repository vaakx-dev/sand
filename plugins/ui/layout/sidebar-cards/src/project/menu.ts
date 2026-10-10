import { errorMessage, type MenuSpec, type NavAction } from '@sand/dom'
import { oneLine } from '@sand/kit'
import type { Context } from 'drydock'
import type { ProjectChoice } from './choices'

type ProjectGroup = NonNullable<ReturnType<NonNullable<Context['projects']>['get']>>

export interface ProjectMenuHooks {
  filter(project: string | undefined): void
  done(): void
  leave(): void
}

const attempt = (ctx: Context, failed: string, work: () => Promise<unknown>) =>
  work().catch(error => ctx.notify?.push(`${failed}: ${errorMessage(error)}`, { level: 'error' }))

const showOnly = (choice: ProjectChoice, hooks: ProjectMenuHooks): NavAction => ({
  id: 'show-only',
  label: 'Show only this project',
  icon: 'eye',
  group: 'show',
  run() {
    hooks.filter(choice.key)
    hooks.done()
  },
})

const showAll = (hooks: ProjectMenuHooks): NavAction => ({
  id: 'show-all',
  label: 'Show all projects',
  icon: 'x',
  group: 'show',
  run() {
    hooks.filter(undefined)
    hooks.done()
  },
})

const newThread = (ctx: Context, group: ProjectGroup, hooks: ProjectMenuHooks): NavAction[] => {
  const threads = ctx.threads
  if (!threads) return []
  const device = threads.device()
  const here = group.locations.find(location => (location.device || undefined) === (device || undefined) && !location.missing)
  if (!here) return []
  const start = async () => {
    hooks.done()
    hooks.leave()
    await threads.draft(here.path, device)
    ctx.composer?.focus()
  }
  return [{ id: 'new-thread', label: 'New thread here', icon: 'compose', group: 'show', run: () => attempt(ctx, 'Could not start a thread', start) }]
}

const rename = (ctx: Context, group: ProjectGroup): NavAction => ({
  id: 'rename',
  label: 'Rename…',
  icon: 'pencil',
  group: 'edit',
  ask: {
    placeholder: group.name,
    tip: 'New project name',
    submit: 'Rename',
    preview(text) {
      const name = oneLine(text)
      return name && name !== group.name ? `Rename to ${name}` : undefined
    },
    run: text => attempt(ctx, 'Could not rename', async () => ctx.projects?.rename(group, oneLine(text))),
  },
  run: () => {},
})

const hide = (ctx: Context, group: ProjectGroup, hooks: ProjectMenuHooks, active: boolean): NavAction => ({
  id: 'hide',
  label: 'Hide project',
  icon: 'x',
  group: 'edit',
  danger: true,
  run: () =>
    attempt(ctx, 'Could not hide', async () => {
      if (active) hooks.filter(undefined)
      hooks.done()
      await ctx.projects?.hide(group, true)
    }),
})

const manage = (ctx: Context, group: ProjectGroup, hooks: ProjectMenuHooks, active: boolean) => [rename(ctx, group), hide(ctx, group, hooks, active)]

export const choiceMenu = (ctx: Context, choice: ProjectChoice, active: boolean, hooks: ProjectMenuHooks): MenuSpec => {
  const group = ctx.projects?.get(choice.key)
  const groupActions = group ? [...newThread(ctx, group, hooks), ...manage(ctx, group, hooks, active)] : []
  return { title: choice.name, actions: [showOnly(choice, hooks), ...groupActions] }
}

export const chipMenu = (ctx: Context, key: string, name: string, hooks: ProjectMenuHooks): MenuSpec => {
  const group = ctx.projects?.get(key)
  return { title: name, actions: [showAll(hooks), ...(group ? manage(ctx, group, hooks, true) : [])] }
}
