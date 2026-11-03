import type { PullMenu } from '@sand/git-pull-page/contract'
import { isLivePull, pullRef } from '@sand/github/look'
import type { ReviewContext } from '../inject'
import { agentReview } from './review'

const label = 'Review with the agent'

export const agentReviewMenu = (ctx: ReviewContext): PullMenu => {
  const { kit } = ctx
  const agent = agentReview(ctx)
  return {
    id: 'review-with-agent',
    order: 0,
    items: ({ pull, close }) => {
      if (!isLivePull(pull.state)) return []
      if (!ctx.github.localCopy(pull.repo)) return [kit.menuItem({ icon: 'sparkles', disabled: true }, kit.menuLabel(label, `Needs a local clone of ${pull.repo}`))]
      const ref = pullRef(pull)
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
          label,
        ),
      ]
    },
  }
}
