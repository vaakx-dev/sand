import type { NavAction } from '@sand/nav/contract'
import type { MenuSpec } from '@sand/ui-kit/contract'
import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from '../context'
import { copyEntries, projectEntries, openAt, startable, visibilityEntry, type Entry } from './actions'
import { shorten } from './places'

const quietly = (work: () => void | Promise<unknown>) => () => (async () => work())().catch(() => {})

const fromEntries = (entries: Entry[], group: string): NavAction[] =>
  entries.filter(entry => !entry.disabled).map(entry => ({ id: `${group}:${entry.label}`, group, label: entry.label, icon: entry.icon, run: quietly(entry.run) }))

export const groupSpec = (ctx: ProjectsContext, group: ProjectGroup): MenuSpec => ({
  title: group.name,
  subtitle: group.remote,
  actions: [
    ...fromEntries(projectEntries(ctx, group), 'project'),
    ...fromEntries(copyEntries(ctx, group), 'copies'),
    ...fromEntries([visibilityEntry(ctx, group)], 'manage'),
    {
      id: 'delete',
      group: 'danger',
      label: 'Delete project',
      icon: 'trash',
      danger: true,
      confirm: `Delete ${group.name}? It is removed from sand on every PC. The folders stay.`,
      run: quietly(() => ctx.projects.remove(group)),
    },
  ],
})

const openChatHere = (ctx: ProjectsContext, entry: ProjectEntry): NavAction[] =>
  startable(ctx, entry) ? [{ id: 'open-chat', group: 'use', label: 'Open chat here', icon: 'message', run: quietly(() => openAt(ctx, entry)) }] : []

export const copySpec = (ctx: ProjectsContext, entry: ProjectEntry): MenuSpec => ({
  title: ctx.machines.name(entry.device),
  subtitle: shorten(ctx, entry.path, entry.device),
  actions: [
    ...openChatHere(ctx, entry),
    { id: 'forget', group: 'manage', label: 'Forget this copy', icon: 'x', run: quietly(() => ctx.projects.removeCopy(entry)) },
    { id: 'copy-path', group: 'copy', label: 'Copy path', icon: 'copy', run: () => ctx.kit.copyText(entry.path) },
  ],
})
