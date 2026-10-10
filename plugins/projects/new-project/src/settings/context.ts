import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import { copyText, errorMessage, type MenuSpec, type NavAction } from '@sand/dom'
import { actions, forgets, startAt, type Entry } from './menu'
import { isOnline, machineName, shorten } from './places'
import type { ProjectsContext } from './types'

const attempt = (ctx: ProjectsContext, work: () => void | Promise<unknown>) => async () => {
  try {
    await work()
  } catch (error) {
    ctx.notify?.push(errorMessage(error), { level: 'error' })
  }
}

const fromEntries = (ctx: ProjectsContext, entries: Entry[], group: string): NavAction[] =>
  entries.filter(entry => !entry.disabled).map(entry => ({ id: `${group}:${entry.label}`, group, label: entry.label, icon: entry.icon, run: attempt(ctx, entry.run) }))

const copyPath = (ctx: ProjectsContext, path: string): NavAction => ({
  id: 'copy-path',
  group: 'copy',
  label: 'Copy path',
  icon: 'copy',
  run: async () => {
    const copied = await copyText(path)
    ctx.notify?.push(copied ? 'Copied path' : 'Could not copy the path', { level: copied ? 'info' : 'error' })
  },
})

export const groupSpec = (ctx: ProjectsContext, group: ProjectGroup): MenuSpec => ({
  title: group.name,
  subtitle: group.remote,
  actions: [
    ...fromEntries(ctx, actions(ctx, group), 'project'),
    ...fromEntries(ctx, forgets(ctx, group), 'copies'),
    {
      id: 'visibility',
      group: 'manage',
      label: group.hidden ? 'Restore' : 'Hide from sand',
      icon: 'eye',
      run: attempt(ctx, () => ctx.projects.hide(group, !group.hidden)),
    },
    {
      id: 'delete',
      group: 'danger',
      label: 'Delete project',
      icon: 'alert',
      danger: true,
      confirm: `Delete ${group.name}? It is removed from sand on every PC. The folders stay.`,
      run: attempt(ctx, () => ctx.projects.remove(group)),
    },
  ],
})

export const copySpec = (ctx: ProjectsContext, entry: ProjectEntry): MenuSpec => ({
  title: machineName(ctx, entry.device),
  subtitle: shorten(ctx, entry.path, entry.device),
  actions: [
    ...(entry.missing || !isOnline(ctx, entry.device)
      ? []
      : [{ id: 'new-thread', group: 'use', label: 'New thread here', icon: 'compose', run: attempt(ctx, () => startAt(ctx, entry)) }]),
    { id: 'forget', group: 'manage', label: 'Forget this copy', icon: 'x', run: attempt(ctx, () => ctx.projects.removeCopy(entry)) },
    copyPath(ctx, entry.path),
  ],
})
