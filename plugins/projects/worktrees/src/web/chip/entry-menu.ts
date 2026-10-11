import type { WorktreeEntry } from '../../contract'
import { copyWithNotice, errorMessage, tildeHome, type MenuSpec, type NavAction } from '@sand/dom'
import { plural } from '@sand/kit'
import type { WebContext, WorktreeClient } from '../client'

const lost = (entry: WorktreeEntry) => {
  const changes = entry.changed ? `its ${plural(entry.changed, 'uncommitted change')}` : 'uncommitted changes'
  return `Deletes ${tildeHome(entry.path)}${entry.branch ? ` and the branch ${entry.branch}` : ''}. Threads there move back to the project folder, and ${changes} and unpushed commits are lost.`
}

export const entryMenu = (ctx: WebContext, client: WorktreeClient, entry: WorktreeEntry, device: string | undefined, use: () => void): MenuSpec => {
  const fail = (what: string) => (error: unknown) => ctx.notify?.push(`Could not ${what}: ${errorMessage(error)}`, { level: 'error' })
  const copy = (text: string, what: string) => () => copyWithNotice(ctx.notify, text, what)
  const branch = entry.branch ?? ''
  const actions: (NavAction | false)[] = [
    { id: 'use', label: 'Start a thread here', icon: 'branch', group: 'use', run: use },
    !!branch && {
      id: 'rename',
      label: 'Rename branch…',
      icon: 'pencil',
      group: 'name',
      ask: {
        placeholder: branch,
        tip: 'New branch name',
        submit: 'Rename',
        preview: text => {
          const name = text.trim()
          return name && name !== branch ? `Rename to ${name}` : undefined
        },
        run: text => client.nameAt(entry.path, text.trim(), device).catch(fail('rename the branch')),
      },
      run: () => {},
    },
    branch.startsWith('sand/') && {
      id: 'regenerate',
      label: 'Regenerate name',
      icon: 'sparkles',
      group: 'name',
      run: () => client.nameAt(entry.path, undefined, device).catch(fail('rename the worktree')),
    },
    { id: 'copy-path', label: 'Copy path', icon: 'folder', group: 'copy', run: copy(entry.path, 'path') },
    !!branch && { id: 'copy-branch', label: 'Copy branch name', icon: 'copy', group: 'copy', run: copy(branch, 'branch name') },
    {
      id: 'delete',
      label: 'Delete worktree',
      icon: 'trash',
      group: 'delete',
      danger: true,
      confirm: lost(entry),
      run: () => client.drop(entry.path, device).catch(fail('delete the worktree')),
    },
  ]
  return { title: branch || tildeHome(entry.path), subtitle: tildeHome(entry.path), actions: actions.filter(action => action !== false) }
}
