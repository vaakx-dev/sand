import type { GitPlace, GitStatus } from '@sand/git/contract'
import type { ListState } from './list'

export type Phase = 'no-folder' | 'waiting' | 'no-repo' | 'loading' | 'error' | 'empty' | 'ready'

export const phaseOf = (at: GitPlace | undefined, status: GitStatus | undefined, list: ListState): Phase => {
  if (!at) return 'no-folder'
  if (!status) return 'waiting'
  if (!status.local.repo) return 'no-repo'
  if (list.kind === 'idle' || list.kind === 'loading') return 'loading'
  if (list.kind === 'error') return 'error'
  return list.list.files.length ? 'ready' : 'empty'
}
