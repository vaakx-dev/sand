import type { NavAction } from '@sand/nav/contract'
import type { MenuSpec } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import { machines, projects, type ProjectGroup, type Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { attempt } from '../items/failure'
import { openDraft } from '../palette/projects'
import type { ProjectChoice } from './choices'

export interface ProjectMenuHooks {
  filter(project: string | undefined): void
  done(): void
  leave(): void
}

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

const newThread = (ctx: Context, threads: Threads, group: ProjectGroup, hooks: ProjectMenuHooks): NavAction[] => {
  const device = threads.device()
  const here = group.locations.find(location => location.device === device && !location.missing && (ctx.get(machines)?.online(device) ?? true))
  if (!here) return []
  const start = async () => {
    hooks.done()
    hooks.leave()
    await openDraft(ctx, threads, here.path, device)
  }
  return [{ id: 'new-thread', label: 'New thread here', icon: 'compose', group: 'show', run: () => attempt(ctx, "Couldn't start a thread", start) }]
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
    run: text => attempt(ctx, "Couldn't rename", () => ctx.get(projects)?.rename(group, oneLine(text))),
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
    attempt(ctx, "Couldn't hide", async () => {
      if (active) hooks.filter(undefined)
      hooks.done()
      await ctx.get(projects)?.hide(group, true)
    }),
})

const manage = (ctx: Context, group: ProjectGroup, hooks: ProjectMenuHooks, active: boolean) => [rename(ctx, group), hide(ctx, group, hooks, active)]

export const choiceMenu = (ctx: Context, threads: Threads, choice: ProjectChoice, active: boolean, hooks: ProjectMenuHooks): MenuSpec => {
  const group = ctx.get(projects)?.get(choice.key)
  const groupActions = group ? [...newThread(ctx, threads, group, hooks), ...manage(ctx, group, hooks, active)] : []
  return { title: choice.name, actions: [showOnly(choice, hooks), ...groupActions] }
}

export const chipMenu = (ctx: Context, key: string, name: string, hooks: ProjectMenuHooks): MenuSpec => {
  const group = ctx.get(projects)?.get(key)
  return { title: name, actions: [showAll(hooks), ...(group ? manage(ctx, group, hooks, true) : [])] }
}
