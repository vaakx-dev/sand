import { pcs } from '@sand/devices-contract'
import { githubClient } from '@sand/github/contract'
import { pullLinksClient } from '@sand/pull-links/contract'
import { toasts } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, pcs, threads, toasts, github: githubClient, pullLinks: pullLinksClient }

export type PullsContext = Context<typeof inject>

export const toastId = 'git-pulls'
