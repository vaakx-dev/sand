import { diffView } from '@sand/git-diff-view/contract'
import { pullPage } from '@sand/git-pull-page/contract'
import { githubClient } from '@sand/github/contract'
import { pullDetailClient } from '@sand/pull-detail/contract'
import { pullReviewClient } from '@sand/pull-review/contract'
import { toasts } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, threads, toasts, pullPage, github: githubClient, diff: diffView, pullDetail: pullDetailClient, review: pullReviewClient }

export type ReviewContext = Context<typeof inject>

export const toastId = 'git-review'
