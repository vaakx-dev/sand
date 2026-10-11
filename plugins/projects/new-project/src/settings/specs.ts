import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import { copyWithNotice, type MenuSpec, type NavAction } from '@sand/dom'
import { reportError, type ProjectsContext } from '../context'
import { copyEntries, projectEntries, startable, startAt, visibilityEntry, type Entry } from './actions'
import { shorten } from './places'

const attempt = (ctx: ProjectsContext, work: () => void | Promise<unknown>) => async () => {
  try {
    await work()
  } catch (error) {
    reportError(ctx, error)
  }
}

const fromEntries = (ctx: ProjectsContext, entries: Entry[], group: string): NavAction[] =>
  entries.filter(entry => !entry.disabled).map(entry => ({ id: `${group}:${entry.label}`, group, label: entry.label, icon: entry.icon, run: attempt(ctx, entry.run) }))

export const groupSpec = (ctx: ProjectsContext, group: ProjectGroup): MenuSpec => ({
  title: group.name,
  subtitle: group.remote,
  actions: [
    ...fromEntries(ctx, projectEntries(ctx, group), 'project'),
    ...fromEntries(ctx, copyEntries(ctx, group), 'copies'),
    ...fromEntries(ctx, [visibilityEntry(ctx, group)], 'manage'),
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

const newThreadHere = (ctx: ProjectsContext, entry: ProjectEntry): NavAction[] =>
  startable(ctx, entry) ? [{ id: 'new-thread', group: 'use', label: 'New thread here', icon: 'compose', run: attempt(ctx, () => startAt(ctx, entry)) }] : []

export const copySpec = (ctx: ProjectsContext, entry: ProjectEntry): MenuSpec => ({
  title: ctx.machines.name(entry.device),
  subtitle: shorten(ctx, entry.path, entry.device),
  actions: [
    ...newThreadHere(ctx, entry),
    { id: 'forget', group: 'manage', label: 'Forget this copy', icon: 'x', run: attempt(ctx, () => ctx.projects.removeCopy(entry)) },
    { id: 'copy-path', group: 'copy', label: 'Copy path', icon: 'copy', run: () => copyWithNotice(ctx.notify, entry.path, 'path') },
  ],
})
