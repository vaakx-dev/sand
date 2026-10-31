import { gitStatusClient } from '@sand/git/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { worktreesClient } from '@sand/worktrees/contract'
import type { Context } from 'drydock'

export const inject = { kit, threads, gitStatus: gitStatusClient, worktrees: worktreesClient }

export type WorkspaceContext = Context<typeof inject>
