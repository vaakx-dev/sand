import type { MenuAction } from '@sand/ui-shell/contract'
import type { MenuSpec } from '@sand/ui-kit/contract'
import type { ProjectEntry, ProjectGroup } from '@sand/web-client/contract'
import type { ProjectsContext } from '../context'
import { bringEntry, copyEntries, projectEntries, openAt, startable, type Entry } from './actions'
import { tildeHome } from '@sand/util'

const quietly = (work: () => void | Promise<unknown>) => () => (async () => work())().catch(() => {})

const fromEntries = (entries: Entry[], group: string): MenuAction[] =>
  entries.filter(entry => !entry.disabled).map(entry => ({ id: `${group}:${entry.label}`, group, label: entry.label, icon: entry.icon, run: quietly(entry.run) }))

const organiseActions = (ctx: ProjectsContext, group: ProjectGroup): MenuAction[] => [
  { id: 'pin', group: 'organise', label: group.pinned ? 'Unpin' : 'Pin', icon: 'pin', quick: true, active: group.pinned, run: quietly(() => ctx.projects.pin(group, !group.pinned)) },
  {
    id: 'archive',
    group: 'organise',
    label: group.archived ? 'Unarchive' : 'Archive',
    icon: group.archived ? 'up' : 'archive',
    quick: true,
    active: group.archived,
    run: quietly(() => ctx.projects.archive(group, !group.archived)),
  },
]

export const groupSpec = (ctx: ProjectsContext, group: ProjectGroup, looks: Entry[] = []): MenuSpec => ({
  title: group.name,
  subtitle: group.remote,
  actions: [
    ...fromEntries(projectEntries(ctx, group), 'project'),
    ...organiseActions(ctx, group),
    ...fromEntries(looks, 'look'),
    ...fromEntries([...bringEntry(ctx, group), ...copyEntries(ctx, group)], 'copies'),
    {
      id: 'delete',
      group: 'danger',
      label: 'Delete project',
      icon: 'trash',
      danger: true,
      confirm: `Delete ${group.name}? It's removed from sand on every PC. The folders stay.`,
      run: () => ctx.projects.remove(group),
    },
  ],
})

const openChatHere = (ctx: ProjectsContext, entry: ProjectEntry): MenuAction[] =>
  startable(ctx, entry) ? [{ id: 'new-thread', group: 'use', label: 'New thread here', icon: 'message', run: quietly(() => openAt(ctx, entry)) }] : []

export const copySpec = (ctx: ProjectsContext, entry: ProjectEntry): MenuSpec => ({
  title: ctx.pcs.name(entry.device),
  subtitle: tildeHome(entry.path),
  actions: [
    ...openChatHere(ctx, entry),
    { id: 'forget', group: 'manage', label: 'Forget this copy', icon: 'x', run: quietly(() => ctx.projects.removeCopy(entry)) },
    { id: 'copy-path', group: 'copy', label: 'Copy path', icon: 'copy', run: () => ctx.kit.copyText(entry.path) },
  ],
})
