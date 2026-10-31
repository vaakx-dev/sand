import { pcs } from '@sand/devices-contract'
import { diffView } from '@sand/git-diff-view/contract'
import { pullPage } from '@sand/git-pull-page/contract'
import { pullDetailClient } from '@sand/pull-detail/contract'
import { pullReviewClient } from '@sand/pull-review/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, pcs, threads, pullPage, diff: diffView, pullDetail: pullDetailClient, review: pullReviewClient }

export type ReviewContext = Context<typeof inject>
