import type { PullMenu } from '@sand/git-pull-page/contract'
import { isLivePull, pullRef } from '@sand/github/look'
import type { ReviewContext } from '../inject'
import { agentReview } from './review'

export const agentReviewMenu = (ctx: ReviewContext): PullMenu => {
  const { kit } = ctx
  const agent = agentReview(ctx)
  return {
    id: 'review-with-agent',
    order: 15,
    items: ({ pull, close }) => {
      if (!isLivePull(pull.state)) return []
      const ref = pullRef(pull)
      if (!ctx.github.localCopy(pull.repo))
        return [
          kit.menuItem(
            { icon: 'sparkles', disabled: true, title: `Add a project with ${pull.repo} as its remote first` },
            'Review with the agent',
            kit.menuReason('No local copy'),
          ),
        ]
      return [
        kit.menuItem(
          {
            icon: 'sparkles',
            title: 'The agent adds its comments to your review',
            disabled: () => agent.starting(ref),
            onClick: () => {
              close()
              void agent.start(ref)
            },
          },
          'Review with the agent',
        ),
      ]
    },
  }
}
