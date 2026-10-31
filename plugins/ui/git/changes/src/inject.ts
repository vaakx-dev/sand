import { gitDiffClient } from '@sand/git-diff/contract'
import { diffView } from '@sand/git-diff-view/contract'
import { gitStatusClient } from '@sand/git/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, threads, gitStatus: gitStatusClient, gitDiff: gitDiffClient, diff: diffView }

export type ChangesContext = Context<typeof inject>
