import type { WorktreeEntry } from '../../contract'
import { copyText, errorMessage, tildeHome, type MenuSpec, type NavAction } from '@sand/dom'
import type { WebContext, WorktreeClient } from '../client'

const lost = (entry: WorktreeEntry) => {
  const changes = entry.changed ? `its ${entry.changed} uncommitted change${entry.changed === 1 ? '' : 's'}` : 'uncommitted changes'
  return `Deletes ${tildeHome(entry.path)}${entry.branch ? ` and the branch ${entry.branch}` : ''}. Threads there move back to the project folder, and ${changes} and unpushed commits are lost.`
}

export const entryMenu = (ctx: WebContext, client: WorktreeClient, entry: WorktreeEntry, device: string | undefined, use: () => void): MenuSpec => {
  const fail = (what: string) => (error: unknown) => ctx.notify?.push(`Could not ${what}: ${errorMessage(error)}`, { level: 'error' })
  const copy = (text: string, what: string) => async () => {
    const copied = await copyText(text)
    ctx.notify?.push(copied ? `Copied ${what}` : `Could not copy the ${what}`, { level: copied ? 'info' : 'error' })
  }
  const branch = entry.branch
  const actions: (NavAction | false)[] = [
    { id: 'use', label: 'Start a thread here', icon: 'branch', group: 'use', run: use },
    Boolean(branch) && {
      id: 'rename',
      label: 'Rename branch…',
      icon: 'pencil',
      group: 'name',
      ask: {
        placeholder: branch ?? '',
        tip: 'New branch name',
        submit: 'Rename',
        preview: text => (text.trim() && text.trim() !== branch ? `Rename to ${text.trim()}` : undefined),
        run: text => client.nameAt(entry.path, text.trim(), device).catch(fail('rename the branch')),
      },
      run: () => {},
    },
    Boolean(branch?.startsWith('sand/')) && {
      id: 'regenerate',
      label: 'Regenerate name',
      icon: 'sparkles',
      group: 'name',
      run: () => client.nameAt(entry.path, undefined, device).catch(fail('rename the worktree')),
    },
    { id: 'copy-path', label: 'Copy path', icon: 'folder', group: 'copy', run: copy(entry.path, 'path') },
    Boolean(branch) && { id: 'copy-branch', label: 'Copy branch name', icon: 'copy', group: 'copy', run: copy(branch ?? '', 'branch name') },
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
  return { title: branch ?? tildeHome(entry.path), subtitle: tildeHome(entry.path), actions: actions.filter(action => action !== false) }
}
