import type { Sessions } from '@sand/chats/contract'
import type { WorktreePull } from '@sand/worktrees/contract'
import { arrangePulls } from '../arrange/arrange'
import type { ThreadLinks } from './links'

export const primaryPull = async (sessions: Sessions, links: ThreadLinks, ids: string[]): Promise<WorktreePull | undefined> => {
  for (const id of ids.filter(id => sessions.open(id))) {
    const { primary } = arrangePulls((await links.view(id)).links)
    if (primary?.summary) return { number: primary.number, state: primary.summary.state }
  }
  return undefined
}
