import { pcs } from '@sand/devices-contract'
import { githubClient } from '@sand/github/contract'
import { pullLinksClient } from '@sand/pull-links/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, pcs, threads, github: githubClient, pullLinks: pullLinksClient }

export type PullsContext = Context<typeof inject>
