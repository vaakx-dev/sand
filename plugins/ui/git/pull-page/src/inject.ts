import { pcs } from '@sand/devices-contract'
import { githubClient } from '@sand/github/contract'
import { pullDetailClient } from '@sand/pull-detail/contract'
import { pullInboxClient } from '@sand/pull-inbox/contract'
import { kit } from '@sand/ui-kit/contract'
import { projects, threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, pcs, projects, threads, github: githubClient, inbox: pullInboxClient, pullDetail: pullDetailClient }

export type PageContext = Context<typeof inject>

export const hereOf = (ctx: PageContext) => ctx.pcs.here().id
